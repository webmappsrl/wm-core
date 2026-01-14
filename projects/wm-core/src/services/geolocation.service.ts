import {Injectable} from '@angular/core';
import {BehaviorSubject, from, Observable, of, ReplaySubject} from 'rxjs';
import {
  BackgroundGeolocationPlugin,
  Location,
  WatcherOptions,
} from '@capacitor-community/background-geolocation';
import {registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';
import {LineString, Position} from 'geojson';
import {WmFeature} from '@wm-types/feature';
import {DeviceService} from './device.service';
import {CStopwatch} from '@wm-core/utils/cstopwatch';
import {getDistance} from 'ol/sphere';
import {distinctUntilChanged, map, startWith, throttleTime} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {setFocusPosition, setOnRecord} from '@wm-core/store/user-activity/user-activity.action';
import {onRecord} from '@wm-core/store/user-activity/user-activity.selector';
import {
  getCurrentUgcTrackLocations,
  saveCurrentUgcTrackLocations,
} from '@wm-core/utils/localForage';

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

  private _mode: 'navigation' | 'recording' | 'stopped' = 'stopped';
  private _isPaused = false;

  onLocationChange$: ReplaySubject<Location> = new ReplaySubject<Location>(1);
  onLocationsChange$: ReplaySubject<Location[]> = new ReplaySubject<Location[]>(1);
  onModeChange: BehaviorSubject<'navigation' | 'recording' | 'stopped'> = new BehaviorSubject(
    this._mode,
  );
  onRecord$: Observable<boolean> = this._store.select(onRecord);

  constructor(private _deviceService: DeviceService, private _store: Store) {
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
  }

  get recordTime(): number {
    return this._recordStopwatch ? this._recordStopwatch.getTime() : 0;
  }

  get location(): Location | null {
    return this._currentLocation;
  }

  get recordedFeature(): WmFeature<LineString> | null {
    return this._recordedFeature;
  }

  get paused(): boolean {
    return this._isPaused;
  }

  get active(): boolean {
    return this._mode === 'navigation' || this._mode === 'recording';
  }

  get currentMode(): 'navigation' | 'recording' | 'stopped' {
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

    if (this._deviceService.isBrowser) {
      this._startWebWatcher('low');
    } else {
      this._startWatcher();
    }
  }

  startRecording(): void {
    if (this._mode === 'recording') return;

    this._mode = 'recording';
    this.onModeChange.next(this._mode);
    this._store.dispatch(setOnRecord({onRecord: true}));

    this._recordStopwatch = new CStopwatch();
    this._recordedFeature = this._getEmptyWmFeature();
    this._isPaused = false;

    if (this._deviceService.isBrowser) {
      this._startWebWatcher('high');
    } else {
      this._startWatcher();
    }
  }

  async resumeRecordingFromSaved(): Promise<void> {
    this._mode = 'recording';
    this.onModeChange.next(this._mode);
    this._store.dispatch(setOnRecord({onRecord: true}));

    const savedLocations = await getCurrentUgcTrackLocations();
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
    this._isPaused = false;

    // Emette le locations salvate per aggiornare la direttiva che mostra la traccia
    if (savedLocations && savedLocations.length > 0) {
      this.onLocationsChange$.next(savedLocations);
    }

    if (this._deviceService.isBrowser) {
      this._startWebWatcher('high');
    } else {
      this._startWatcher();
    }
  }

  async stopRecording(): Promise<WmFeature<LineString> | null> {
    if (this._mode !== 'recording') return null;

    const recordedFeature = this._recordedFeature;

    this._recordStopwatch?.stop();
    this._recordStopwatch = null;
    this._recordedFeature = null;
    this._isPaused = false;
    this._store.dispatch(setOnRecord({onRecord: false}));
    this._mode = 'stopped';
    this.onModeChange.next(this._mode);
    this.onLocationChange$.next(null);

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
  }

  private _isLocationAlreadyRecorded(location: Location): boolean {
    const coords = this._recordedFeature?.geometry?.coordinates;
    if (!coords?.length) {
      return false;
    }

    const lastCoord = coords[coords.length - 1];
    const altitude = location.altitude ?? 0;
    return (
      lastCoord[0] === location.longitude &&
      lastCoord[1] === location.latitude &&
      lastCoord[2] === altitude
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

    // Aggiunge le coordinate alla geometry
    this._recordedFeature.geometry.coordinates.push([
      location.longitude,
      location.latitude,
      location.altitude ?? 0,
    ]);

    // Aggiunge la location alle properties
    this._recordedFeature.properties?.locations?.push(location);

    // Salva su localForage ad ogni aggiornamento
    saveCurrentUgcTrackLocations(this._recordedFeature.properties?.locations);
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
