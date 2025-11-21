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
import {map, startWith} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {
  setCurrentLocation,
  setCurrentUgcTrackRecording,
  setFocusPosition,
  setOnRecord,
} from '@wm-core/store/user-activity/user-activity.action';
import {onRecord} from '@wm-core/store/user-activity/user-activity.selector';
import {getCurrentUgcTrack, getCurrentUgcTrackTime} from '@wm-core/utils/localForage';

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

  onLocationChange: ReplaySubject<Location> = new ReplaySubject<Location>(1);
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

  get hasCurrentUgcTrack$(): Observable<Boolean> {
    return from(getCurrentUgcTrack()).pipe(map(currentUgcTrack => currentUgcTrack != null));
  }

  async resumeRecordingFromSaved(): Promise<void> {
    this.startNavigation();

    const [savedFeature, savedTime] = await Promise.all([
      getCurrentUgcTrack(),
      getCurrentUgcTrackTime(),
    ]);
    if (this._mode === 'recording') return;

    this._mode = 'recording';
    this.onModeChange.next(this._mode);
    this._store.dispatch(setOnRecord({onRecord: true}));
    this._store.dispatch(
      setCurrentUgcTrackRecording({currentUgcTrackRecording: savedFeature, recordTime: savedTime}),
    );

    // Ripristina il cronometro con il tempo salvato
    this._recordStopwatch = new CStopwatch(
      JSON.stringify({
        startTime: Date.now(),
        totalTime: savedTime,
        isPaused: false,
      }),
    );
    // Crea una copia profonda per evitare problemi con oggetti non estensibili
    this._recordedFeature = savedFeature;

    this.pauseRecording();

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

    return this.onLocationChange.pipe(
      startWith(null),
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
    );
  }

  private _startWatcher(): void {
    if (this._watcherId != null) return;
    backgroundGeolocation
      .addWatcher(this._getWatcherOptions('high'), (location, error) => {
        if (error) return;
        this._onLocationUpdate(location);

        if (this._mode === 'recording' && this._recordedFeature) {
          this._recordedFeature = {
            ...this._recordedFeature,
            geometry: {
              ...this._recordedFeature.geometry,
              coordinates: [
                ...this._recordedFeature.geometry.coordinates,
                [location.longitude, location.latitude, location.altitude ?? 0],
              ],
            },
            properties: {
              ...this._recordedFeature.properties,
              locations: [...this._recordedFeature.properties.locations, location],
            },
          };

          this._store.dispatch(
            setCurrentUgcTrackRecording({
              currentUgcTrackRecording: this._recordedFeature,
              recordTime: this.recordTime,
            }),
          );
        }
      })
      .then(id => (this._watcherId = id));
  }

  private _startWebWatcher(accuracy: 'high' | 'low'): void {
    this._webWatcherId = navigator.geolocation.watchPosition(
      res => {
        const location = {
          latitude: res.coords.latitude,
          longitude: res.coords.longitude,
          altitude: res.coords.altitude ?? 0,
          accuracy: res.coords.accuracy,
          time: res.timestamp,
        };
        this._onLocationUpdate(location as Location);

        if (this._mode === 'recording' && this._recordedFeature) {
          this._recordedFeature = {
            ...this._recordedFeature,
            geometry: {
              ...this._recordedFeature.geometry,
              coordinates: [
                ...this._recordedFeature.geometry.coordinates,
                [res.coords.longitude, res.coords.latitude, res.coords.altitude ?? 0],
              ],
            },
            properties: {
              ...this._recordedFeature.properties,
              locations: [...this._recordedFeature.properties.locations, location],
            },
          };

          this._store.dispatch(
            setCurrentUgcTrackRecording({
              currentUgcTrackRecording: this._recordedFeature,
              recordTime: this.recordTime,
            }),
          );
        }
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
    this.onLocationChange.next(location);
    //TODO: fare refactor utilizzando currentLocation dello store e non onLocationChange
    this._store.dispatch(setCurrentLocation({location}));
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
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [
            this._currentLocation.longitude,
            this._currentLocation.latitude,
            this._currentLocation.altitude ?? 0,
          ],
        ],
      },
      properties: {locations: [this._currentLocation]},
    };
  }
}

const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
