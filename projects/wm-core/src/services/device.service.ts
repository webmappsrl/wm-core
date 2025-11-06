/**
 * Device Service
 *
 * It provides access to all the physical component installed in
 * the device such as compass, gps, camera...
 *
 * */

import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Platform} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Observable, ReplaySubject, of, throwError} from 'rxjs';
import {catchError, filter, map, take, timeout, retryWhen, delay, mergeMap} from 'rxjs/operators';
import {Device} from '@capacitor/device';
import {APP_VERSION} from '@wm-core/store/conf/conf.token';
import {online} from '@wm-core/store/network/network.selector';
import {WmDeviceInfo} from '@wm-types/feature';
import {IAPP} from '@wm-core/types/config';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private _height: number;
  private _isAndroid: boolean;
  private _isBackground: boolean;
  private _isBrowser: boolean;
  private _isIos: boolean;
  private _isLocalServer: boolean;
  private _onBackground: ReplaySubject<void>;
  private _onForeground: ReplaySubject<void>;
  private _onResize: ReplaySubject<{
    width: number;
    height: number;
  }>;
  private _width: number;

  get height(): number {
    return this._height;
  }

  get isAndroid(): boolean {
    return this._isAndroid;
  }

  get isBackground(): boolean {
    return this._isBackground;
  }

  get isBrowser(): boolean {
    return this._isBrowser;
  }

  get isForeground(): boolean {
    return !this._isBackground;
  }

  get isIos(): boolean {
    return this._isIos;
  }

  get isLocalServer(): boolean {
    return this._isLocalServer;
  }

  get isMobile(): boolean {
    return this.isAndroid || this.isIos;
  }

  get width(): number {
    return this._width;
  }

  public onBackground: Observable<void>;
  public onForeground: Observable<void>;
  public onResize: Observable<{
    width: number;
    height: number;
  }>;

  constructor(
    private _platform: Platform,
    private _http: HttpClient,
    private _store: Store<any>,
    @Inject(APP_VERSION) public appVersion: string,
  ) {
    this._onResize = new ReplaySubject(1);
    this._onBackground = new ReplaySubject(1);
    this._onForeground = new ReplaySubject(1);
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this._onResize.next({
      width: this._width,
      height: this._height,
    });
    this.onResize = this._onResize;
    this.onBackground = this._onBackground;
    this.onForeground = this._onForeground;

    this._isBrowser =
      this._platform.is('pwa') || this._platform.is('desktop') || this._platform.is('mobileweb');
    this._isAndroid = this._platform.is('android');
    this._isIos = this._platform.is('ios');
    this._isLocalServer = window.location.href.indexOf('localhost') !== -1;

    window.addEventListener('resize', () => {
      this._width = +window.innerWidth;
      this._height = +window.innerHeight;
      this._onResize.next({
        width: this._width,
        height: this._height,
      });
    });

    this._isBackground = false;

    document.addEventListener(
      'pause',
      () => {
        this._isBackground = true;
        this._onBackground.next();
      },
      false,
    );
    document.addEventListener(
      'resume',
      () => {
        this._isBackground = false;
        this._onForeground.next();
      },
      false,
    );
  }

  /**
   * List of SKUs for special instances that have version with "1" prefix
   * Special instances have version like "13.1.6" instead of "3.1.6"
   * Aligned with wrongInstanceVersion in gulpfile.js
   */
  private readonly _wrongSkuVersion = [
    'it.webmapp.fumaiolosentieri',
    'it.webmapp.pec',
    'it.webmapp.cammini',
    'it.webmapp.ucvs',
    'it.webmapp.gavorrano',
    'it.webmapp.sicai',
  ];

  /**
   * Checks if the current app is a wrong sku version (has version with "1" prefix)
   * Wrong sku versions have version like "13.1.6" instead of "3.1.6"
   * @param appConfig APP configuration from backend
   * @returns true if the app is a wrong sku version
   */
  private _isWrongSkuVersion(appConfig: IAPP): boolean {
    // Check using sku from config
    if (appConfig.sku && this._wrongSkuVersion.includes(appConfig.sku)) {
      return true;
    }

    // Fallback: if sku is not in the list, check based on version format
    // If version starts with "1" followed by a digit, it's a wrong sku version
    // Example: "13.1.6" -> true, "3.1.6" -> false, "1.0.0" -> false
    return /^1\d\./.test(this.appVersion);
  }

  async getInfo(): Promise<WmDeviceInfo> {
    const info = await Device.getInfo();
    return {
      ...info,
      appVersion: this.appVersion,
    };
  }

  /**
   * Retrieves the last release version of the app from GitHub
   * For wrong sku versions, adds "1" to the version for comparison and display
   * Includes timeout (10s), network check, and retry when connection is restored
   * @param appConfig APP configuration from backend
   * @returns Observable with the version (possibly modified) or null in case of error
   */
  getLastReleaseVersion(appConfig: IAPP): Observable<string | null> {
    const githubUrl =
      'https://raw.githubusercontent.com/webmappsrl/webmapp-app/refs/heads/main/package.json';
    const timeoutMs = 5000; // 5 seconds timeout

    // Check network status first
    return this._store.select(online).pipe(
      take(1),
      mergeMap(isOnline => {
        if (!isOnline) {
          return of(null);
        }

        return this._http.get<{version: string}>(githubUrl).pipe(
          timeout(timeoutMs),
          map(response => {
            const baseVersion = response.version || null;

            if (!baseVersion) return null;

            // If it's a wrong sku version, add "1" to the GitHub version
            if (this._isWrongSkuVersion(appConfig)) {
              const adjustedVersion = '1' + baseVersion;
              return adjustedVersion;
            }

            return baseVersion;
          }),
          retryWhen(errors =>
            errors.pipe(
              mergeMap((error, index) => {
                const retryAttempt = index + 1;
                const maxRetries = 3;
                const retryDelayBaseMs = 2000;

                // Don't retry on timeout or client errors (4xx)
                if (
                  error.name === 'TimeoutError' ||
                  (error.status && error.status >= 400 && error.status < 500)
                ) {
                  return throwError(error);
                }

                // Check if we should retry
                if (retryAttempt > maxRetries) {
                  return throwError(error);
                }

                // Determine if it's a network error (no status or status 0)
                const isNetworkError = !error.status || error.status === 0;

                if (isNetworkError) {
                  // For network errors, wait for connection to be restored
                  return this._store.select(online).pipe(
                    filter(isOnline => isOnline),
                    take(1),
                    delay(retryDelayBaseMs * retryAttempt), // Exponential backoff
                  );
                } else {
                  // For other errors (e.g., 5xx), retry with backoff without waiting for connection
                  return of(null).pipe(delay(retryDelayBaseMs * retryAttempt));
                }
              }),
            ),
          ),
          catchError(() => {
            return of(null);
          }),
        );
      }),
    );
  }

  /**
   * Returns the appropriate store URL based on the device
   * @param appConfig APP configuration from backend
   * @returns Store URL (androidStore or iosStore) or null if not available
   */
  getStoreUrl(appConfig: IAPP): string | null {
    if (this.isAndroid && appConfig.androidStore) {
      return appConfig.androidStore;
    } else if (this.isIos && appConfig.iosStore) {
      return appConfig.iosStore;
    }
    return null;
  }
}
