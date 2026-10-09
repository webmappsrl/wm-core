import {Inject, Injectable, Optional} from '@angular/core';
import {BehaviorSubject, from, Observable, of, ReplaySubject} from 'rxjs';
import {
  BackgroundGeolocationPlugin,
  Location,
  WatcherOptions,
} from '@capacitor-community/background-geolocation';
import {registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';
import {LineString, Position} from 'geojson';
import {Location as WmLocation, WmFeature} from '@wm-types/feature';
import {DeviceService} from './device.service';
import {CStopwatch} from '@wm-core/utils/cstopwatch';
import {getDistance} from 'ol/sphere';
import {distinctUntilChanged, map, pairwise, startWith, throttleTime} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {setFocusPosition, setOnRecord} from '@wm-core/store/user-activity/user-activity.action';
import {onRecord} from '@wm-core/store/user-activity/user-activity.selector';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {GeolocationMode} from '@wm-types/user-activity';
import {
  getCurrentUgcTrackLocations,
  saveCurrentUgcTrackLocations,
} from '@wm-core/utils/localForage';
import {UgcTrackStatsParams} from '@wm-core/types/config';
import {
  UGC_TRACK_STATS_DEFAULT_PARAMS,
  UgcTrackCleaner,
  recordedGeometryCoordinates,
} from '@wm-core/utils/ugc-track-stats';
import {UgcTrackStatsService} from './ugc-track-stats.service';

const THROTTLE_TIME_DISTANCE = 10000; //10 seconds
const DIFFERENCE_THRESHOLD_DISTANCE = 20; //20 meters

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private _currentLocation: Location | null = null;
  private _recordedFeature: WmFeature<LineString> | null = null;
  private _recordStopwatch: CStopwatch | null = null;

  private _watcherId: string | null = null;
  private _webWatcherId: number | null = null;

  private _mode: GeolocationMode = 'stopped';
  private _isPaused = false;
  // Pulizia GPS della registrazione in corso, la stessa del server (oc:8743)
  private _cleaner: UgcTrackCleaner | null = null;
  private _statsParams: UgcTrackStatsParams = UGC_TRACK_STATS_DEFAULT_PARAMS;

  onLocationChange$: ReplaySubject<Location> = new ReplaySubject<Location>(1);
  /** Punti tenuti dalla pulizia GPS nella registrazione in corso: è ciò che disegna la linea live. */
  recordedKeptLocations$: BehaviorSubject<WmLocation[]> = new BehaviorSubject<WmLocation[]>([]);
  onModeChange: BehaviorSubject<GeolocationMode> = new BehaviorSubject(
    this._mode,
  );
  onRecord$: Observable<boolean> = this._store.select(onRecord);

  constructor(
    private _deviceService: DeviceService,
    private _store: Store,
    private _ugcTrackStatsSvc: UgcTrackStatsService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient: WmPosthogClient | null,
  ) {
    this._ugcTrackStatsSvc.params$.subscribe(params => {
      this._statsParams = params;
      // Se la config arriva (o cambia) a registrazione in corso, per esempio dopo una ripresa
      // all'avvio, la pulizia si rifà con i parametri giusti sui punti già registrati
      if (this._cleaner && this._recordedFeature) {
        this._startCleaner(this._recordedFeature.properties?.locations ?? []);
      }
    });
    if (!this._deviceService.isBrowser) {
      App.addListener('appStateChange', async ({isActive}) => {
        if (isActive) {
          this._startWatcher();
        } else {
          if (this._mode != 'recording') {
            await this._stopWatcher();
          }
        }
      });
    }

    this.onModeChange.pipe(pairwise()).subscribe(([prev, curr]) => {
      if (curr === 'recording') {
        this._posthogClient?.capture('recordingStarted');
      } else if (prev === 'recording' && curr === 'stopped') {
        this._posthogClient?.capture('recordingStopped');
      }
    });
  }

  get recordTime(): number {
    return this._recordStopwatch ? this._recordStopwatch.getTime() : 0;
  }

  get location(): Location | null {
    return this._currentLocation;
  }

  /**
   * La traccia registrata: `properties.locations` grezzi, `geometry` con i soli punti tenuti dalla
   * pulizia GPS come se la registrazione finisse ora (con meno di 2 punti tenuti, i punti grezzi
   * validi: una geometria vuota non si salverebbe). È ciò che si salva; leggerla non cambia lo
   * stato della pulizia, quindi se il salvataggio si annulla la registrazione prosegue uguale.
   */
  get recordedFeature(): WmFeature<LineString> | null {
    if (!this._recordedFeature) {
      return null;
    }
    const kept = this._cleaner?.keptIfStoppedNow() ?? [];
    return {
      ...this._recordedFeature,
      geometry: {
        type: 'LineString',
        coordinates: recordedGeometryCoordinates(
          kept,
          this._recordedFeature.properties?.locations ?? [],
        ),
      },
    };
  }

  get paused(): boolean {
    return this._isPaused;
  }

  get active(): boolean {
    return this._mode === 'navigation' || this._mode === 'recording';
  }

  get currentMode(): GeolocationMode {
    return this._mode;
  }

  get hasCurrentUgcTrack$(): Observable<Boolean> {
    return from(getCurrentUgcTrackLocations()).pipe(
      map(currentUgcTrackLocations => currentUgcTrackLocations != null),
    );
  }

  startNavigation(): void {
    if (this._mode === 'navigation' || this._mode === 'recording') return;

    this._mode = 'navigation';
    this.onModeChange.next(this._mode);

    this._startLocationWatcher('low');
  }

  startRecording(): void {
    if (this._mode === 'recording') return;

    this._mode = 'recording';
    this.onModeChange.next(this._mode);
    this._store.dispatch(setOnRecord({onRecord: true}));

    this._recordStopwatch = new CStopwatch();
    this._recordedFeature = this._getEmptyWmFeature();
    this._startCleaner(this._recordedFeature.properties?.locations ?? []);
    this._isPaused = false;

    this._startLocationWatcher('high');
  }

  async resumeRecordingFromSaved(): Promise<void> {
    const savedLocations = await getCurrentUgcTrackLocations();

    this._mode = 'recording';
    this.onModeChange.next(this._mode);
    this._store.dispatch(setOnRecord({onRecord: true}));

    const elapsedTime = this._calculateElapsedTimeFromLocations(savedLocations);

    // Inizializza lo stopwatch con il tempo già trascorso
    this._recordStopwatch = new CStopwatch(
      JSON.stringify({
        startTime: Date.now(),
        totalTime: elapsedTime,
        isPaused: false,
      }),
    );

    this._recordedFeature = this._createRecordedFeatureFromLocations(savedLocations);
    // La pulizia riparte dai punti grezzi salvati: la linea torna con i soli punti tenuti
    this._startCleaner(this._recordedFeature.properties?.locations ?? []);
    this._isPaused = false;

    this._startLocationWatcher('high');
  }

  async stopRecording(): Promise<WmFeature<LineString> | null> {
    if (this._mode !== 'recording') return null;

    const recordedFeature = this.recordedFeature;

    this._recordStopwatch?.stop();
    this._recordStopwatch = null;
    this._recordedFeature = null;
    this._cleaner = null;
    this.recordedKeptLocations$.next([]);
    this._isPaused = false;
    this._store.dispatch(setOnRecord({onRecord: false}));
    this._mode = 'stopped';
    this.onModeChange.next(this._mode);

    this.startNavigation();

    return recordedFeature;
  }

  async stopAll(): Promise<void> {
    await this._stopWatcher();
    this._mode = 'stopped';
    this.onModeChange.next(this._mode);
    this._store.dispatch(setOnRecord({onRecord: false}));
  }

  pauseRecording(): void {
    this._recordStopwatch?.pause();
    this._isPaused = true;
    this._store.dispatch(setFocusPosition({focusPosition: false}));
  }

  resumeRecording(): void {
    this._recordStopwatch?.resume();
    this._isPaused = false;
    this._store.dispatch(setFocusPosition({focusPosition: true}));
  }

  openAppSettings(): void {
    if (!this._deviceService.isBrowser) {
      backgroundGeolocation.openSettings();
    }
  }

  getDistanceFromCurrentLocation$(destinationPosition: Position): Observable<number | null> {
    if (destinationPosition == null || destinationPosition.length < 2) return of(null);

    return this.onLocationChange$.pipe(
      startWith(null),
      throttleTime(THROTTLE_TIME_DISTANCE), // Calcola distanza max ogni THROTTLE_TIME_DISTANCE seconds
      map(currentLocation => {
        if (
          currentLocation != null &&
          currentLocation.latitude != null &&
          currentLocation.longitude != null
        ) {
          return getDistance(
            [currentLocation.longitude, currentLocation.latitude],
            [destinationPosition[0], destinationPosition[1]],
          );
        }
        return null;
      }),
      distinctUntilChanged((prev, curr) => {
        // Emetti solo se la differenza è > DIFFERENCE_THRESHOLD_DISTANCE per evitare aggiornamenti inutili
        if (prev == null || curr == null) return false;
        return Math.abs(prev - curr) < DIFFERENCE_THRESHOLD_DISTANCE;
      }),
    );
  }

  /**
   * Avvia il watcher appropriato in base alla piattaforma (browser o nativa).
   * @param accuracy Livello di accuratezza richiesto ('high' o 'low')
   */
  private _startLocationWatcher(accuracy: 'high' | 'low'): void {
    if (this._deviceService.isBrowser) {
      this._startWebWatcher(accuracy);
    } else {
      this._startWatcher();
    }
  }

  private _startWatcher(): void {
    if (this._watcherId != null) return;
    backgroundGeolocation
      .addWatcher(this._getWatcherOptions('high'), (location, error) => {
        if (error) return;
        this._onLocationUpdate(location);
        this._addLocationToRecording(location);
      })
      .then(id => (this._watcherId = id));
  }

  private _startWebWatcher(accuracy: 'high' | 'low'): void {
    this._webWatcherId = navigator.geolocation.watchPosition(
      res => {
        if (!res || !res.coords) {
          console.warn('WebGeolocation: invalid position data');
          return;
        }

        const location: Location = {
          latitude: res.coords.latitude,
          longitude: res.coords.longitude,
          altitude: res.coords.altitude ?? 0,
          accuracy: res.coords.accuracy,
          altitudeAccuracy: res.coords.altitudeAccuracy ?? null,
          bearing: res.coords.heading ?? null,
          speed: res.coords.speed ?? null,
          simulated: false,
          time: res.timestamp,
        };

        this._onLocationUpdate(location);
        this._addLocationToRecording(location);
      },
      () => {},
      {enableHighAccuracy: accuracy === 'high'},
    );
  }

  private async _stopWatcher(): Promise<void> {
    if (this._watcherId) {
      await backgroundGeolocation.removeWatcher({id: this._watcherId});
      this._watcherId = null;
    }
  }
  private _calculateSpeed(prevLocation: Location, currentLocation: Location): number {
    if (prevLocation != null && currentLocation != null) {
      const prevCoords = [prevLocation.longitude, prevLocation.latitude];
      const currentCoords = [currentLocation.longitude, currentLocation.latitude];
      const dist = getDistance(prevCoords, currentCoords);
      const time = (currentLocation.time - prevLocation.time) / 1000;

      return dist / 1000 / (time / 3600);
    }
    return 0;
  }
  private _onLocationUpdate(location: Location): void {
    location.time = location.time || Date.now();
    location.speed =
      location.speed != null
        ? location.speed * 3.6
        : this._calculateSpeed(this._currentLocation, location);
    this._currentLocation = location;
    this.onLocationChange$.next(location);
    this._posthogClient?.capture('userMoved', {mode: this._mode});
  }

  private _isLocationAlreadyRecorded(location: Location): boolean {
    const locations = this._recordedFeature?.properties?.locations;
    if (!locations?.length) {
      return false;
    }

    const last = locations[locations.length - 1];
    return (
      last.longitude === location.longitude &&
      last.latitude === location.latitude &&
      (last.altitude ?? 0) === (location.altitude ?? 0)
    );
  }

  /**
   * Aggiunge una location alla registrazione corrente e salva su localForage.
   */
  private _addLocationToRecording(location: Location): void {
    if (this._mode !== 'recording' || !this._recordedFeature) {
      return;
    }

    if (this._isLocationAlreadyRecorded(location)) {
      return;
    }

    // Le properties tengono il punto grezzo, come lo riceve il server; la geometry si ricava dai
    // punti tenuti (vedi il getter recordedFeature)
    this._recordedFeature.properties?.locations?.push(location);
    if (this._cleaner?.push(location).length) {
      this.recordedKeptLocations$.next(this._cleaner.kept);
    }

    // Salva su localForage ad ogni aggiornamento
    saveCurrentUgcTrackLocations(this._recordedFeature.properties?.locations);
  }

  /**
   * Fa ripartire la pulizia GPS sui punti già registrati e aggiorna la linea live.
   */
  private _startCleaner(locations: WmLocation[]): void {
    this._cleaner = new UgcTrackCleaner(this._statsParams);
    locations.forEach(location => this._cleaner.push(location));
    this.recordedKeptLocations$.next(this._cleaner.kept);
  }

  private _getWatcherOptions(accuracy: 'high' | 'low'): WatcherOptions {
    const highDistanceFilter = +localStorage.getItem('wm-distance-filter') || 10;
    return {
      backgroundMessage: 'Tracking in background',
      backgroundTitle: 'Tracking Active',
      distanceFilter: accuracy === 'high' ? highDistanceFilter : 100,
      requestPermissions: true,
      stale: false,
    };
  }

  private _getEmptyWmFeature(): WmFeature<LineString> {
    try {
      // Validazione della location corrente
      const lon = this._currentLocation?.longitude ?? 0;
      const lat = this._currentLocation?.latitude ?? 0;
      const alt = this._currentLocation?.altitude ?? 0;

      // Se non c'è una location valida, usa coordinate di default (0,0)
      const isValidLocation = this._currentLocation && !isNaN(lon) && !isNaN(lat);

      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: isValidLocation ? [[lon, lat, alt]] : [[0, 0, 0]], // Coordinate di default se non valide
        },
        properties: {
          locations: isValidLocation ? [this._currentLocation] : [],
        },
      };
    } catch (error) {
      console.error('Error creating empty WmFeature:', error);
      // Ritorna una feature vuota di fallback
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0, 0]],
        },
        properties: {locations: []},
      };
    }
  }

  /**
   * Crea la _recordedFeature a partire da un array di locations.
   * Converte l'array di Location in geometry.coordinates e popola properties.locations.
   */
  private _createRecordedFeatureFromLocations(locations: Location[] | null): WmFeature<LineString> {
    try {
      if (!locations || locations.length === 0) {
        console.warn('_createRecordedFeatureFromLocations: No locations provided');
        return this._getEmptyWmFeature();
      }

      // Converte le locations in coordinate [lon, lat, alt]
      const coordinates: Position[] = locations.map(loc => [
        loc.longitude,
        loc.latitude,
        loc.altitude ?? 0,
      ]);

      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          locations,
        },
      };
    } catch (error) {
      console.error('Error creating recorded feature from locations:', error);
      return this._getEmptyWmFeature();
    }
  }

  /**
   * Calcola il tempo trascorso tra la prima e l'ultima location.
   * @returns tempo in millisecondi
   */
  private _calculateElapsedTimeFromLocations(locations: Location[] | null): number {
    if (!locations || locations.length < 2) {
      return 0;
    }

    const firstLocation = locations[0];
    const lastLocation = locations[locations.length - 1];

    if (firstLocation.time == null || lastLocation.time == null) {
      return 0;
    }

    return lastLocation.time - firstLocation.time;
  }
}

const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
