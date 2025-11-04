/**
 * Device Service
 *
 * It provides access to all the physical component installed in
 * the device such as compass, gps, camera...
 *
 * */

import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ModalController, Platform} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Observable, ReplaySubject, of, combineLatest, Subject, throwError} from 'rxjs';
import {
  catchError,
  filter,
  map,
  take,
  shareReplay,
  distinctUntilChanged,
  takeUntil,
  timeout,
  retryWhen,
  delay,
  mergeMap,
  tap,
} from 'rxjs/operators';
import {Device} from '@capacitor/device';
import {APP_VERSION} from '@wm-core/store/conf/conf.token';
import {confAPP} from '@wm-core/store/conf/conf.selector';
import {online} from '@wm-core/store/network/network.selector';
import {WmDeviceInfo} from '@wm-types/feature';
import {IAPP} from '@wm-core/types/config';
import {ModalUpdateAppComponent} from '../../../../../../../app/components/modal-update-app/modal-update-app.component';

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
  private _hasOpenReleaseUpdateModal: boolean = false;
  private _destroy$: Subject<void> = new Subject<void>();

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
    private _modalController: ModalController,
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

    // Initialize release update popup check
    this._initReleaseUpdatePopupCheck();
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

  /**
   * Initializes the release update popup check
   * Checks for updates only when online and retries when connection is restored
   */
  private _initReleaseUpdatePopupCheck(): void {
    console.log('[RELEASE UPDATE POPUP] Initializing release update check...');

    // Combine app config and network status
    combineLatest([this._store.select(confAPP), this._store.select(online)])
      .pipe(
        distinctUntilChanged((prev, curr) => {
          const [prevConfig, prevOnline] = prev as [IAPP | null, boolean];
          const [currConfig, currOnline] = curr as [IAPP | null, boolean];

          // If appConfig changes from null to non-null or vice versa, emit
          if ((prevConfig === null) !== (currConfig === null)) {
            return false;
          }

          // If both are null, compare only online status
          if (!prevConfig || !currConfig) {
            return prevConfig === currConfig && prevOnline === currOnline;
          }

          // Only emit if forceToReleaseUpdate changes, appConfig changes significantly, or online status changes
          return (
            prevConfig.forceToReleaseUpdate === currConfig.forceToReleaseUpdate &&
            prevConfig.androidStore === currConfig.androidStore &&
            prevConfig.iosStore === currConfig.iosStore &&
            prevOnline === currOnline
          );
        }),
        takeUntil(this._destroy$),
      )
      .subscribe(([appConfig, isOnline]) => {
        console.log('[RELEASE UPDATE POPUP] APP config received:', {
          appConfig,
          isOnline,
        });

        if (!isOnline) {
          console.log('[RELEASE UPDATE POPUP] Device is offline, skipping update check');
          return;
        }

        if (appConfig != null && appConfig.forceToReleaseUpdate === true) {
          console.log('[RELEASE UPDATE POPUP] forceToReleaseUpdate is true, checking popup...');
          this._checkAndShowReleaseUpdatePopup(appConfig);
        } else {
          console.log('[RELEASE UPDATE POPUP] forceToReleaseUpdate is false or appConfig null', {
            forceToReleaseUpdate: appConfig?.forceToReleaseUpdate,
            appConfig: appConfig,
          });
        }
      });
  }

  /**
   * Checks and shows the release update popup if necessary
   * @param appConfig APP configuration from backend
   */
  private async _checkAndShowReleaseUpdatePopup(appConfig: IAPP): Promise<void> {
    // Prevent multiple modals from opening
    if (this._hasOpenReleaseUpdateModal) {
      console.log('[RELEASE UPDATE POPUP] Modal already open, skipping...');
      return;
    }

    // Use shareReplay to avoid duplicate calls to getLastReleaseVersion
    const lastVersion$ = this.getLastReleaseVersion(appConfig).pipe(shareReplay(1));

    // Combine async calls
    combineLatest([this._checkReleaseUpdateConditions(appConfig, lastVersion$), lastVersion$])
      .pipe(
        take(1),
        takeUntil(this._destroy$),
        catchError(error => {
          console.error('[RELEASE UPDATE POPUP] Error in release update check:', error);
          return of([false, null]);
        }),
      )
      .subscribe(async ([shouldShow, lastVersion]) => {
        if (shouldShow && lastVersion) {
          const storeUrl = this.getStoreUrl(appConfig);
          if (storeUrl) {
            console.log(
              '[RELEASE UPDATE POPUP] Creating and presenting modal with URL:',
              storeUrl,
              'and version:',
              lastVersion,
            );
            const modal = await this._modalController.create({
              component: ModalUpdateAppComponent,
              componentProps: {
                storeUrl,
                productionVersion: lastVersion,
              },
              backdropDismiss: true,
              showBackdrop: true,
            });

            // Set flag to prevent multiple modals
            this._hasOpenReleaseUpdateModal = true;

            // Reset flag when modal is dismissed
            modal.onWillDismiss().then(() => {
              this._hasOpenReleaseUpdateModal = false;
              console.log('[RELEASE UPDATE POPUP] Modal dismissed, flag reset');
            });

            await modal.present();
            console.log('[RELEASE UPDATE POPUP] Modal presented');
          }
        }
      });
  }

  /**
   * Checks conditions to show release update popup using the already retrieved version
   * @param appConfig APP configuration from backend
   * @param lastVersion$ Observable with the last version
   * @returns Observable with true if popup should be shown
   */
  private _checkReleaseUpdateConditions(
    appConfig: IAPP,
    lastVersion$: Observable<string | null>,
  ): Observable<boolean> {
    // Check if forceToReleaseUpdate is active
    if (!appConfig.forceToReleaseUpdate) {
      return of(false);
    }

    // Check if BOTH store URLs are present
    if (!appConfig.androidStore || !appConfig.iosStore) {
      return of(false);
    }

    // Check if installed version is different from last version
    return lastVersion$.pipe(
      map(lastVersion => {
        if (!lastVersion) {
          return false;
        }
        return lastVersion !== this.appVersion;
      }),
    );
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

    console.log('[RELEASE UPDATE POPUP] Retrieving version from GitHub:', githubUrl);

    // Check network status first
    return this._store.select(online).pipe(
      take(1),
      mergeMap(isOnline => {
        if (!isOnline) {
          console.warn('[RELEASE UPDATE POPUP] Device is offline, cannot retrieve version');
          return of(null);
        }

        return this._http.get<{version: string}>(githubUrl).pipe(
          timeout(timeoutMs),
          map(response => {
            console.log('[RELEASE UPDATE POPUP] GitHub response received:', response);
            const baseVersion = response.version || null;

            if (!baseVersion) return null;

            // If it's a wrong sku version, add "1" to the GitHub version
            if (this._isWrongSkuVersion(appConfig)) {
              const adjustedVersion = '1' + baseVersion;
              console.log('[RELEASE UPDATE POPUP] wrong sku version detected, adjusted version:', {
                baseVersion,
                adjustedVersion,
                appVersion: this.appVersion,
                sku: appConfig.sku,
              });
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
                  console.error('[RELEASE UPDATE POPUP] Non-retryable error:', error);
                  return throwError(error);
                }

                // Check if we should retry
                if (retryAttempt > maxRetries) {
                  console.error('[RELEASE UPDATE POPUP] Max retries reached, giving up');
                  return throwError(error);
                }

                // Determine if it's a network error (no status or status 0)
                const isNetworkError = !error.status || error.status === 0;

                if (isNetworkError) {
                  // For network errors, wait for connection to be restored
                  console.log(
                    `[RELEASE UPDATE POPUP] Network error detected, waiting for connection. Retry attempt ${retryAttempt}/${maxRetries}`,
                  );
                  return this._store.select(online).pipe(
                    filter(isOnline => isOnline),
                    take(1),
                    delay(retryDelayBaseMs * retryAttempt), // Exponential backoff
                    tap(() =>
                      console.log('[RELEASE UPDATE POPUP] Connection restored, retrying...'),
                    ),
                  );
                } else {
                  // For other errors (e.g., 5xx), retry with backoff without waiting for connection
                  console.log(
                    `[RELEASE UPDATE POPUP] Server error (${error.status}), retrying with backoff. Retry attempt ${retryAttempt}/${maxRetries}`,
                  );
                  return of(null).pipe(
                    delay(retryDelayBaseMs * retryAttempt),
                    tap(() => console.log('[RELEASE UPDATE POPUP] Retrying after backoff...')),
                  );
                }
              }),
            ),
          ),
          catchError(error => {
            if (error.name === 'TimeoutError') {
              console.error('[RELEASE UPDATE POPUP] Request timeout after', timeoutMs, 'ms');
            } else {
              console.error('[RELEASE UPDATE POPUP] GitHub call error:', error);
            }
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
      console.log(
        '[RELEASE UPDATE POPUP] Android device, using androidStore:',
        appConfig.androidStore,
      );
      return appConfig.androidStore;
    } else if (this.isIos && appConfig.iosStore) {
      console.log('[RELEASE UPDATE POPUP] iOS device, using iosStore:', appConfig.iosStore);
      return appConfig.iosStore;
    } else {
      // Fallback: if not Android nor iOS, try iOS then Android
      const fallbackUrl = appConfig.iosStore || appConfig.androidStore;
      console.log('[RELEASE UPDATE POPUP] Device not recognized, using fallback:', fallbackUrl);
      return fallbackUrl || null;
    }
  }
}
