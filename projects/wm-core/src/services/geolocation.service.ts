import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of, ReplaySubject} from 'rxjs';
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
import {setCurrentLocation} from '@wm-core/store/user-activity/user-activity.action';

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
  onRecord$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

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
    this.onRecord$.next(true);

    this._recordStopwatch = new CStopwatch();
    this._recordedFeature = this._getEmptyWmFeature();
    this._isPaused = false;

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
    this.onRecord$.next(false);
    this._mode = 'stopped';
    this.onModeChange.next(this._mode);

    this.startNavigation();

    return recordedFeature;
  }

  async stopAll(): Promise<void> {
    await this._stopWatcher();
    this._mode = 'stopped';
    this.onModeChange.next(this._mode);
    this.onRecord$.next(false);
  }

  pauseRecording(): void {
    this._recordStopwatch?.pause();
    this._isPaused = true;
  }

  resumeRecording(): void {
    this._recordStopwatch?.resume();
    this._isPaused = false;
  }

  openAppSettings(): void {
    if (!this._deviceService.isBrowser) {
      backgroundGeolocation.openSettings();
    }
  }

  getDistanceFromCurrentLocation$(destinationPosition: Position): Observable<number | null> {
    if (
      destinationPosition == null
      || destinationPosition.length < 2
    ) return of(null);

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
          this._recordedFeature.geometry.coordinates.push([
            location.longitude,
            location.latitude,
            location.altitude ?? 0,
          ]);
          this._recordedFeature.properties.locations.push(location);
        }
      })
      .then(id => (this._watcherId = id));
  }

  private _startWebWatcher(accuracy: 'high' | 'low'): void {
    this._webWatcherId = navigator.geolocation.watchPosition(
      res =>
        this._onLocationUpdate({
          latitude: res.coords.latitude,
          longitude: res.coords.longitude,
          altitude: res.coords.altitude ?? 0,
          accuracy: res.coords.accuracy,
          time: res.timestamp,
        } as any),
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
      geometry: {type: 'LineString', coordinates: []},
      properties: {locations: []},
    };
  }
}

const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
