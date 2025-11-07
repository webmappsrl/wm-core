/**
 * Device Service
 *
 * It provides access to all the physical component installed in
 * the device such as compass, gps, camera...
 *
 * */

import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Platform, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Observable, ReplaySubject} from 'rxjs';
import {Device} from '@capacitor/device';
import {Browser} from '@capacitor/browser';
import {APP_VERSION} from '@wm-core/store/conf/conf.token';
import {WmDeviceInfo} from '@wm-types/feature';
import {APP} from '@wm-types/config';
import {ModalReleaseUpdateComponent} from '../modal-release-update/modal-release-update.component';

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

  get isAppMobile(): boolean {
    return this.isMobile && !this.isBrowser;
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
  private _isWrongSkuVersion(appConfig: APP): boolean {
    return !!(appConfig.sku && this._wrongSkuVersion.includes(appConfig.sku));
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
   * @param appConfig APP configuration from backend
   * @returns Promise with the version (possibly modified) or null in case of error
   */
  async getLastReleaseVersion(appConfig: APP): Promise<string | null> {
    const githubUrl =
      'https://raw.githubusercontent.com/webmappsrl/webmapp-app/refs/heads/main/package.json';

    try {
      const response = await this._http.get<{version: string}>(githubUrl).toPromise();
      const gitVersion = response?.version || null;

      if (!gitVersion) return null;

      // If it's a wrong sku version, add "1" to the GitHub version
      if (this._isWrongSkuVersion(appConfig)) {
        return '1' + gitVersion;
      }

      return gitVersion;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if the current version is different from the GitHub version
   * For wrong sku versions, both versions are normalized (with "1" prefix) before comparison:
   * - this.appVersion already has "1" prefix (set during build process in gulpfile.js)
   * - githubVersion gets "1" prefix added by getLastReleaseVersion if it's a wrong sku version
   * This ensures correct comparison between app version and GitHub version for all instances
   * @param appConfig APP configuration from backend
   * @returns Promise that resolves to true if update is needed, false otherwise, or null in case of error
   */
  async checkIfUpdateNeeded(appConfig: APP): Promise<boolean> {
    try {
      const githubVersion = await this.getLastReleaseVersion(appConfig);
      if (!githubVersion) {
        return false;
      }
      // Compare current version with GitHub version
      // For wrong sku versions, both versions are already normalized (with "1" prefix)
      return this.appVersion !== githubVersion;
    } catch (error) {
      return false;
    }
  }

  /**
   * Opens the update modal if update is needed
   * Assumes all prerequisites have been checked (mobile, forceToReleaseUpdate, store URLs)
   * @param appConfig APP configuration from backend
   * @returns Promise that resolves when the check is complete
   */
  async openUpdateModalIfNeeded(appConfig: APP): Promise<void> {
    try {
      const updateNeeded = await this.checkIfUpdateNeeded(appConfig);
      if (updateNeeded) {
        // Get the appropriate store URL based on device
        const storeUrl = this.isAndroid
          ? appConfig.androidStore
          : this.isIos
          ? appConfig.iosStore
          : null;

        if (storeUrl) {
          // Get production version to show in modal
          const gitVersion = await this.getLastReleaseVersion(appConfig);
          const modal = await this._modalController.create({
            component: ModalReleaseUpdateComponent,
            componentProps: {
              storeUrl,
              gitVersion,
            },
            backdropDismiss: true,
            showBackdrop: true,
          });
          await modal.present();
        }
      }
    } catch (error) {}
  }

  /**
   * Opens the store URL in the appropriate way based on the device
   * On iOS simulator or browser, uses window.open directly
   * On native device, tries Browser.open with fallback to window.open
   * @param storeUrl The store URL to open
   */
  async openStoreUrl(storeUrl: string): Promise<void> {
    if (!storeUrl) {
      return;
    }

    try {
      window.open(storeUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      await Browser.open({url: storeUrl});
    }
  }
}
