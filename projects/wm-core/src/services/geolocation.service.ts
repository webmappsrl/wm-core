import {Injectable} from '@angular/core';
import {BehaviorSubject, ReplaySubject} from 'rxjs';
import {CStopwatch} from 'wm-core/utils/cstopwatch';
import {BackgroundGeolocationPlugin, Location, WatcherOptions} from '@capacitor-community/background-geolocation';
import {registerPlugin} from '@capacitor/core';
import {getDistance} from 'ol/sphere';
import { DeviceService } from './device.service';
import { App } from '@capacitor/app';
import {LineString} from 'geojson';
import {WmFeature} from '@wm-types/feature';
import {IGeolocationServiceState} from 'wm-core/types/location';

export interface Watcher {
  id: string;
  type: 'web' | 'background';
}

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private _currentLocation: Location;
  private _recordStopwatch: CStopwatch;
  private _recordedFeature: WmFeature<LineString>;
  private _state: IGeolocationServiceState = {
    isLoading: false,
    isActive: false,
    isRecording: false,
    isPaused: false,
  };
  private _watcher: BehaviorSubject<Watcher> = new BehaviorSubject<Watcher>(null);
  private _watcherOptions: WatcherOptions = {
    backgroundMessage: 'Cancel to prevent battery drain.',
    backgroundTitle: 'Tracking You.',
    requestPermissions: true,
    stale: false,
  }

  get active(): boolean {
    return !!this?._state?.isActive;
  }

  get loading(): boolean {
    return !!this?._state?.isLoading;
  }

  get location(): Location {
    return this?._currentLocation;
  }

  get paused(): boolean {
    return !!this?._state?.isPaused;
  }

  get recordTime(): number {
    return this._recordStopwatch ? this._recordStopwatch.getTime() : 0;
  }

  get recordedFeature(): WmFeature<LineString> {
    return this?._recordedFeature;
  }

  get recording(): boolean {
    return !!this?._state?.isRecording;
  }

  onGeolocationStateChange: ReplaySubject<IGeolocationServiceState> =
    new ReplaySubject<IGeolocationServiceState>(1);
  // External events
  onLocationChange: ReplaySubject<Location> = new ReplaySubject<Location>(1);
  onPause$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  onRecord$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  onStart$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private _daviceService: DeviceService) {
    if(!this._daviceService.isBrowser){
      App.addListener('appStateChange', ({isActive}) => {
        if (!isActive) {
          if(!this.onRecord$.value){
            this.stop();
          }
        }
        else{
          this.start();
        }
      });
    }
  }

  getWatcherOptions(accuracy: 'high' | 'low' = 'low'): WatcherOptions {
    const highDistanceFilter = +localStorage.getItem('wm-distance-filter') || 10;
    return {
      ...this._watcherOptions,
      distanceFilter: accuracy === 'high' ? highDistanceFilter : LOW_DISTANCE_FILTER,
    };
  }

  /**
   * Pause the geolocation record if active
   */
  pauseRecording(): void {
    this._recordStopwatch.pause();
    this.onPause$.next(true);
  }

  reset(): void {
    this.onStart$.next(true);
    this.onRecord$.next(false);
    this.onPause$.next(false);
    this.stop();
    this.start();
  }

  /**
   * Resume the geolocation record
   */
  resumeRecording(): void {
    this._recordStopwatch.resume();
    this.onRecord$.next(true);
    this.onPause$.next(false);
  }

  /**
   * Start the geolocation service
   */
  start(): void {
    this.onStart$.next(true);
    if(this._watcher.value == null){
      if (this._daviceService.isBrowser) {
        this._webWatcher();
      }
      else{
        this._backgroundGeolocationWatcher();
      }
    }
  }

  /**
   * Start the geolocation record. From this moment the received coordinates will
   * be saved until the stopRecording is called
   */
  startRecording(): void {
    this._recordStopwatch = new CStopwatch();
    this._recordedFeature = this._getEmptyWmFeature();
    this.onStart$.next(true);
    this.onRecord$.next(true);
    this.onPause$.next(false);
    this._clearCurrentWatcher();
    this._backgroundGeolocationWatcher('high');
  }

  /**
   * Stop the geolocation service
   */
  stop(): void {
    this.onStart$.next(false);
    this.onRecord$.next(false);
    this.onPause$.next(false);
    this._clearCurrentWatcher();
  }

  /**
   * Stop the geolocation service
   */
  stopRecording(): WmFeature<LineString> {
    this._recordStopwatch.stop();
    return this._stopRecording();
  }

  private _addLocationToRecordedFeature(location: Location): void {
    if (this._recordedFeature) {
      this._recordedFeature.geometry.coordinates.push([location.longitude, location.latitude]);
      const locations: Array<Location> = this._recordedFeature?.properties?.locations ?? [];
      locations.push(location);
      this._recordedFeature.properties.locations = locations;
    }
  }

  private _backgroundGeolocationWatcher(accuracy: 'high' | 'low' = 'low'): void {
    const options: WatcherOptions = this.getWatcherOptions(accuracy);
    backgroundGeolocation
      .addWatcher(
        options,
        (location, error) => {
          if (error) {
            return console.error(error);
          }
          console.log(
            'backgroundGeolocation->GeolocationService location:',
            JSON.stringify(location),
          );
          if (this.onStart$.value) {
            this._locationUpdate(location);
          }
          return console.log(location);
        },
      )
      .then(watcher_id => {
        this._watcher.next({type: 'background', id: watcher_id});
      });
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

  private _clearCurrentWatcher(): void {
    const watcher = this._watcher.value;
    if(watcher && watcher.id != null){
      if (this._watcher.value.type === 'web') {
        navigator.geolocation.clearWatch(+this._watcher.value.id);
      } else {
        backgroundGeolocation.removeWatcher({id: this._watcher.value.id});
      }
      this._watcher.next(null);
    }
  }

  //TODO: da tipizzare la funzione
  private _cloneAsObject<T>(obj): T {
    if (obj === null || !(obj instanceof Object)) {
      return obj;
    }
    var temp = {};
    // ReSharper disable once MissingHasOwnPropertyInForeach
    for (var key in obj) {
      if (obj[key] != null) {
        temp[key] = this._cloneAsObject(obj[key]);
      }
    }
    return temp as T;
  }

  private _getEmptyWmFeature(): WmFeature<LineString> {
    return {
      type: 'Feature',
      geometry: {type: 'LineString', coordinates: []},
      properties: {},
    };
  }

  /**
   * Process a new location
   *
   * @param rawLocation the new location
   */
  private _locationUpdate(rawLocation: Location): void {
    rawLocation = this._cloneAsObject(rawLocation);
    if (Number.isNaN(rawLocation.latitude) || Number.isNaN(rawLocation.longitude)) return;

    if (rawLocation.latitude && typeof rawLocation.latitude !== 'number') {
      const latitude: number = parseFloat(rawLocation.latitude);
      if (!Number.isNaN(latitude)) rawLocation.latitude = latitude;
      else return;
    }

    if (rawLocation.longitude && typeof rawLocation.longitude !== 'number') {
      const longitude: number = parseFloat(rawLocation.longitude);
      if (!Number.isNaN(longitude)) rawLocation.latitude = longitude;
      else return;
    }
    rawLocation.time = rawLocation.time != null ? rawLocation.time : Date.now();
    rawLocation.speed =
      rawLocation.speed != null
        ? rawLocation.speed * 3.6
        : this._calculateSpeed(this._currentLocation, rawLocation);

    this._currentLocation = {...rawLocation};

    if (this.onRecord$.value && !this.onPause$.value) {
      this._addLocationToRecordedFeature(this._currentLocation);
    }

    this.onLocationChange.next(this._currentLocation);
  }

  /**
   * Stop the location record
   */
  private _stopRecording(): WmFeature<LineString> {
    this.onStart$.next(false);
    this.onRecord$.next(false);
    this.onPause$.next(false);
    this._clearCurrentWatcher();
    this._backgroundGeolocationWatcher();

    return this._recordedFeature;
  }

  private _webWatcher(): void {
    const watcherId = navigator.geolocation.watchPosition(
      res => {
        if (this.onStart$.value) {
          this._locationUpdate((res as any).coords as Location);
        }
      },
      function errorCallback(error) {
        // console.log(error);
      },
      {maximumAge: 60000, timeout: 100, enableHighAccuracy: true},
    );
    this._watcher.next({type: 'web', id: `${watcherId}`});
  }
}

const LOW_DISTANCE_FILTER = 100;
const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
