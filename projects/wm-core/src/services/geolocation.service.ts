import {Injectable} from '@angular/core';
import {BehaviorSubject, ReplaySubject} from 'rxjs';
import {
  BackgroundGeolocationPlugin,
  Location,
  WatcherOptions,
} from '@capacitor-community/background-geolocation';
import {registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';
import {LineString} from 'geojson';
import {WmFeature} from '@wm-types/feature';
import {DeviceService} from './device.service';
import {CStopwatch} from '@wm-core/utils/cstopwatch';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private _currentLocation: Location | null = null;
  private _recordedFeature: WmFeature<LineString> | null = null;
  private _recordStopwatch: CStopwatch | null = null;

  private _navigationWatcherId: string | null = null;
  private _recordingWatcherId: string | null = null;
  private _webWatcherId: number | null = null;

  private _mode: 'navigation' | 'recording' | 'stopped' = 'stopped';
  private _isPaused = false;

  onLocationChange: ReplaySubject<Location> = new ReplaySubject<Location>(1);
  onModeChange: BehaviorSubject<'navigation' | 'recording' | 'stopped'> = new BehaviorSubject(
    this._mode,
  );
  onRecord$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private _deviceService: DeviceService) {
    console.log('[GeolocationService] Inizializzato');

    if (!this._deviceService.isBrowser) {
      App.addListener('appStateChange', async ({isActive}) => {
        console.log(
          `[AppState] Stato: ${isActive ? 'FOREGROUND' : 'BACKGROUND'}, Modalità: ${this._mode}`,
        );

        if (this._mode === 'navigation') {
          if (isActive) {
            console.log('[Navigation] Rientrato in foreground: Avvio watcher');
            this._startNavigationWatcher();
          } else {
            console.log('[Navigation] Andato in background: Stop watcher');
            await this._stopNavigationWatcher();
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
    if (this._mode === 'navigation') return;
    console.log('[Navigation] Avvio modalità');

    this._mode = 'navigation';
    this.onModeChange.next(this._mode);
    this._stopRecordingWatcher();

    if (this._deviceService.isBrowser) {
      this._startWebWatcher('low');
    } else {
      this._startNavigationWatcher();
    }
  }

  startRecording(): void {
    if (this._mode === 'recording') return;
    console.log('[Recording] Avvio modalità');

    this._mode = 'recording';
    this.onModeChange.next(this._mode);
    this.onRecord$.next(true);

    this._recordStopwatch = new CStopwatch();
    this._recordedFeature = this._getEmptyWmFeature();
    this._isPaused = false;

    this._stopNavigationWatcher();

    if (this._deviceService.isBrowser) {
      this._startWebWatcher('high');
    } else {
      this._startRecordingWatcher();
    }
  }

  async stopRecording(): Promise<WmFeature<LineString> | null> {
    if (this._mode !== 'recording') return null;
    console.log('[Recording] Stop modalità');

    const recordedFeature = this._recordedFeature;

    this._recordStopwatch?.stop();
    this._recordStopwatch = null;
    this._recordedFeature = null;
    this._isPaused = false;
    this.onRecord$.next(false);

    await this._stopRecordingWatcher();
    this.startNavigation();

    return recordedFeature;
  }

  async stopAll(): Promise<void> {
    console.log('[GeolocationService] Stop di tutti i watcher');
    await this._stopRecordingWatcher();
    await this._stopNavigationWatcher();
    this._mode = 'stopped';
    this.onModeChange.next(this._mode);
    this.onRecord$.next(false);
  }

  pauseRecording(): void {
    console.log('[Recording] Pausa registrazione');
    this._recordStopwatch?.pause();
    this._isPaused = true;
  }

  resumeRecording(): void {
    console.log('[Recording] Ripresa registrazione');
    this._recordStopwatch?.resume();
    this._isPaused = false;
  }

  openAppSettings(): void {
    console.log('[GeolocationService] Apertura impostazioni app');
    if (!this._deviceService.isBrowser) {
      backgroundGeolocation.openSettings();
    }
  }

  private _startNavigationWatcher(): void {
    console.log('[Navigation] Attivo watcher con low accuracy');
    backgroundGeolocation
      .addWatcher(this._getWatcherOptions('low'), (location, error) => {
        if (error) return;
        console.log('[Navigation] Nuova posizione:', location);
        this._onLocationUpdate(location);
      })
      .then(id => (this._navigationWatcherId = id));
  }

  private _startRecordingWatcher(): void {
    console.log('[Recording] Attivo watcher con HIGH ACCURACY');
    backgroundGeolocation
      .addWatcher(this._getWatcherOptions('high'), (location, error) => {
        if (error) return;
        console.log('[Recording] Nuova posizione:', location);
        this._onLocationUpdate(location);

        if (this._mode === 'recording' && this._recordedFeature) {
          this._recordedFeature.geometry.coordinates.push([
            location.longitude,
            location.latitude,
            location.altitude ?? 0,
          ]);
        }
      })
      .then(id => (this._recordingWatcherId = id));
  }

  private _startWebWatcher(accuracy: 'high' | 'low'): void {
    console.log(`[WebWatcher] Attivo con accuracy: ${accuracy}`);
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

  private async _stopNavigationWatcher(): Promise<void> {
    if (this._navigationWatcherId) {
      console.log('[Navigation] Stop watcher');
      await backgroundGeolocation.removeWatcher({id: this._navigationWatcherId});
      this._navigationWatcherId = null;
    }
  }

  private async _stopRecordingWatcher(): Promise<void> {
    if (this._recordingWatcherId) {
      console.log('[Recording] Stop watcher');
      await backgroundGeolocation.removeWatcher({id: this._recordingWatcherId});
      this._recordingWatcherId = null;
    }
  }

  private _onLocationUpdate(location: Location): void {
    console.log('[GeolocationService] Aggiornamento posizione:', location);
    this._currentLocation = location;
    this.onLocationChange.next(location);
  }

  private _getWatcherOptions(accuracy: 'high' | 'low'): WatcherOptions {
    const highDistanceFilter = +localStorage.getItem('wm-distance-filter') || 10;
    console.log('[GeolocationService] DISTANCE FILTER:', highDistanceFilter);
    return {
      backgroundMessage: 'Tracking in background',
      backgroundTitle: 'Tracking Active',
      distanceFilter: accuracy === 'high' ? highDistanceFilter : 100,
      requestPermissions: true,
      stale: false,
    };
  }

  private _getEmptyWmFeature(): WmFeature<LineString> {
    return {type: 'Feature', geometry: {type: 'LineString', coordinates: []}, properties: {}};
  }
}

const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
