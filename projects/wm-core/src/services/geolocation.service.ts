import {Injectable} from '@angular/core';
import {Platform} from '@ionic/angular';
import {BehaviorSubject, ReplaySubject} from 'rxjs';
import {CStopwatch} from 'wm-core/utils/cstopwatch';
import {BackgroundGeolocationPlugin, Location} from '@capacitor-community/background-geolocation';
import {registerPlugin} from '@capacitor/core';
import {getDistance} from 'ol/sphere';
import {LineString} from 'geojson';
import {WmFeature} from '@wm-types/feature';
import {IGeolocationServiceState} from 'wm-core/types/location';

const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
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
  private _watcher: BehaviorSubject<string | null> = new BehaviorSubject<null>(null);

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

  constructor(private _platform: Platform) {}

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
    //const isLocalServer: boolean = window.location.href.indexOf('localhost') !== -1;
    if (this._watcher.value == null) {
      if (
        this._platform.is('ios') ||
        this._platform.is('android') ||
        this._platform.is('capacitor')
      ) {
        this._nativeWatcher();
      } else {
        this._webWatcher();
      }
    }
  }

  /**
   * Start the geolocation record. From this moment the received coordinates will
   * be saved until the stopRecording is called
   */
  startRecording(): void {
    this._recordStopwatch = new CStopwatch();
    this._recordedFeature = null;
    this.onStart$.next(true);
    this.onRecord$.next(true);
    this.onPause$.next(false);
    //  this._recordStopwatch.start();
  }

  /**
   * Stop the geolocation service
   */
  stop(): void {
    this.onStart$.next(false);
    this.onRecord$.next(false);
    this.onPause$.next(false);
    if (this._watcher.value != null) {
      backgroundGeolocation.removeWatcher({
        id: this._watcher.value,
      });
    }
    this._watcher.next(null);
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

  private _nativeWatcher(): void {
    const distanceFilter = +localStorage.getItem('wm-distance-filter') || 10;

    backgroundGeolocation
      .addWatcher(
        {
          // If the "backgroundMessage" option is defined, the watcher will
          // provide location updates whether the app is in the background or the
          // foreground. If it is not defined, location updates are only
          // guaranteed in the foreground. This is true on both platforms.

          // On Android, a notification must be shown to continue receiving
          // location updates in the background. This option specifies the text of
          // that notification.
          backgroundMessage: 'Cancel to prevent battery drain.',

          // The title of the notification mentioned above. Defaults to "Using
          // your location".
          backgroundTitle: 'Tracking You.',

          // Whether permissions should be requested from the user automatically,
          // if they are not already granted. Defaults to "true".
          requestPermissions: true,

          // If "true", stale locations may be delivered while the device
          // obtains a GPS fix. You are responsible for checking the "time"
          // property. If "false", locations are guaranteed to be up to date.
          // Defaults to "false".
          stale: false,

          // The minimum number of metres between subsequent locations. Defaults
          // to 0.
          distanceFilter,
        },
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
        // When a watcher is no longer needed, it should be removed by calling
        // 'removeWatcher' with an object containing its ID.
        this._watcher.next(watcher_id);
      });
  }

  /**
   * Stop the location record
   */
  private _stopRecording(): WmFeature<LineString> {
    this.onStart$.next(false);
    this.onRecord$.next(false);
    this.onPause$.next(false);

    return this._recordedFeature;
  }

  private _webWatcher(): void {
    this._watcher.next('navigator');
    navigator.geolocation.watchPosition(
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
  }
}
