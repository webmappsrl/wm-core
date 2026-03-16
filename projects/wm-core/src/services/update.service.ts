import {Inject, Injectable} from '@angular/core';
import {AlertController, ModalController, ToastController} from '@ionic/angular';
import {App} from '@capacitor/app';
import {AppUpdate} from '@capawesome/capacitor-app-update';
import {HttpClient} from '@angular/common/http';

import {APP_VERSION} from '@wm-core/store/conf/conf.token';
import {WmStorePlatformInfo, WmStoreVersionResponse, WmUpdateEvaluation, WmUpdateType} from '@wm-types/update';
import {APP} from '@wm-types/config';
import {
  UPDATE_MAJOR_KEY_PREFIX,
  UPDATE_MINOR_INTERVAL_MS,
  UPDATE_MINOR_KEY_PREFIX,
  UPDATE_PATCH_INTERVAL_MS,
  UPDATE_PATCH_KEY_PREFIX,
} from '../constants/update';
import {ModalReleaseUpdateComponent} from '../modal-release-update/modal-release-update.component';
import {LangService} from '../localization/lang.service';
import {EnvironmentService} from './environment.service';
import {DeviceService} from './device.service';

@Injectable({providedIn: 'root'})
export class UpdateService {
  constructor(
    private _modalController: ModalController,
    private _toastController: ToastController,
    @Inject(APP_VERSION) private _appVersion: string,
    private _environmentSvc: EnvironmentService,
    private _http: HttpClient,
    private _deviceService: DeviceService,
    private _alertController: AlertController,
    private _langSvc: LangService,
  ) {}

  // ── Versioni ────────────────────────────────────────────────────────────────

  /**
   * Restituisce la versione disponibile nello store come stringa SemVer (x.y.z).
   * Se `availableVersionName` è presente (iOS, o Android con versionName) lo usa direttamente.
   * Altrimenti (Android senza versionName) decodifica `availableVersionCode` secondo lo schema:
   *   - code < 100000:  M·MM·PP   (es. 30108 → 3.1.8)
   *   - code >= 100000: M·MM·PPP  (es. 301080 → 3.1.80)
   */
  async getLastReleaseVersion(): Promise<string | null> {
    try {
      const info = await AppUpdate.getAppUpdateInfo();

      if (info.availableVersionName) {
        return info.availableVersionName;
      }

      // Fallback: decodifica availableVersionCode → stringa SemVer
      if (info.availableVersionCode) {
        const code = Number(info.availableVersionCode);
        const decoded = this.decodeVersionCode(code);
        if (decoded) {
          return `${decoded.major}.${decoded.minor}.${decoded.patch}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async getCurrentAppVersion(): Promise<string | null> {
    try {
      const info = await App.getInfo();
      return info.version ?? this._appVersion ?? null;
    } catch {
      return this._appVersion ?? null;
    }
  }

  // ── Backend ─────────────────────────────────────────────────────────────────

  private async getBackendStoreInfo(): Promise<WmStorePlatformInfo | null> {
    try {
      const url = `${this._environmentSvc.origin}/api/app/${this._environmentSvc.appId}/version`;
      const response = await this._http.get<WmStoreVersionResponse>(url).toPromise();
      if (!response) {
        return null;
      }
      if (this._deviceService.isAndroid) {
        return response.android ?? null;
      }
      if (this._deviceService.isIos) {
        return response.ios ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Recupera le release notes dal backend solo se la versione corrisponde a quella attesa.
   */
  private async fetchReleaseNotes(evaluation: WmUpdateEvaluation): Promise<string | null> {
    try {
      const info = await this.getBackendStoreInfo();
      const target = evaluation.storeVersion ?? evaluation.minVersion;
      if (info?.version && target && info.version === target) {
        return info.release_notes ?? null;
      }
    } catch {}
    return null;
  }

  // ── SemVer & VersionCode ─────────────────────────────────────────────────────

  private parseSemVer(
    version: string | null | undefined,
  ): {major: number; minor: number; patch: number} | null {
    if (!version) {
      return null;
    }
    const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return null;
    }
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  /**
   * Decodifica un versionCode numerico Android nella tripla {major, minor, patch}.
   *
   * Il formato è MMNNPP0 (trailing zero aggiunto dal gulpfile):
   *  1. Si rimuove lo 0 finale dividendo per 10 → base = MMNNPP
   *  2. major = base / 10000, minor = (base % 10000) / 100, patch = base % 100
   *
   * Esempi:
   *  - 30108   → 3.1.8
   *  - 301080  → 3.1.80
   *  - 1001080 → 10.1.80
   */
  private decodeVersionCode(code: number): {major: number; minor: number; patch: number} | null {
    if (!Number.isFinite(code) || code < 0) {
      return null;
    }
    const base = Math.floor(code / 10);
    return {
      major: Math.floor(base / 10000),
      minor: Math.floor((base % 10000) / 100),
      patch: base % 100,
    };
  }

  /**
   * Confronta due triple {major, minor, patch}.
   * Ritorna `1` se a > b, `-1` se a < b, `0` se uguali.
   */
  private compareTriples(
    a: {major: number; minor: number; patch: number},
    b: {major: number; minor: number; patch: number},
  ): number {
    if (a.major !== b.major) {
      return a.major > b.major ? 1 : -1;
    }
    if (a.minor !== b.minor) {
      return a.minor > b.minor ? 1 : -1;
    }
    if (a.patch !== b.patch) {
      return a.patch > b.patch ? 1 : -1;
    }
    return 0;
  }

  /**
   * Confronta due stringhe SemVer.
   * Ritorna `1` se a > b, `-1` se a < b, `0` se uguali, `null` se non parsabili.
   */
  private compareSemVer(a: string | null, b: string | null): number | null {
    const av = this.parseSemVer(a);
    const bv = this.parseSemVer(b);
    if (!av || !bv) {
      return null;
    }
    return this.compareTriples(av, bv);
  }

  /**
   * Determina il tipo di differenza tra due triple versionate (major/minor/patch).
   */
  private diffType(
    current: {major: number; minor: number; patch: number},
    target: {major: number; minor: number; patch: number},
  ): WmUpdateType {
    if (target.major > current.major) {
      return 'major';
    }
    if (target.major === current.major && target.minor > current.minor) {
      return 'minor';
    }
    if (target.major === current.major && target.minor === current.minor && target.patch > current.patch) {
      return 'patch';
    }
    return 'none';
  }

  /**
   * Determina il tipo di differenza SemVer tra due stringhe versione.
   */
  private semVerDiffType(current: string | null, target: string | null): WmUpdateType {
    const c = this.parseSemVer(current);
    const t = this.parseSemVer(target);
    if (!c || !t) {
      return 'none';
    }
    return this.diffType(c, t);
  }

  // ── Throttling ──────────────────────────────────────────────────────────────

  /**
   * Ritorna `true` se la chiave è stata salvata di recente e l'azione NON va ripetuta.
   */
  private isThrottled(key: string, storage: Storage, intervalMs: number): boolean {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        return Date.now() - new Date(raw).getTime() < intervalMs;
      }
    } catch {}
    return false;
  }

  private markShown(key: string, storage: Storage): void {
    try {
      storage.setItem(key, new Date().toISOString());
    } catch {}
  }

  // ── Evaluate ────────────────────────────────────────────────────────────────

  async evaluateUpdate(appConfig: APP): Promise<WmUpdateEvaluation> {
    const [current, minVersion, storeVersionName] = await Promise.all([
      this.getCurrentAppVersion(),
      Promise.resolve(this.getMinVersionFromConfig(appConfig)),
      this.getLastReleaseVersion(),
    ]);

    let type: WmUpdateType = 'none';

    const cmpMin = this.compareSemVer(current, minVersion);
    const cmpStore = this.compareSemVer(current, storeVersionName);

    if (cmpMin !== null && cmpMin < 0) {
      // Versione corrente inferiore alla minima → forzato
      type = 'major';
    } else if (cmpStore !== null && cmpStore < 0) {
      // Confronto SemVer con versione nello store
      type = this.semVerDiffType(current, storeVersionName);
    }

    return {type, currentVersion: current, minVersion, storeVersion: storeVersionName};
  }

  // ── Flow principale ─────────────────────────────────────────────────────────

  async handleAppUpdateFlow(appConfig: APP): Promise<void> {
    const evaluation = await this.evaluateUpdate(appConfig);
    const storeUrl = this.resolveStoreUrl(appConfig);

    switch (evaluation.type) {
      case 'patch':
        await this.handlePatchUpdate(evaluation, storeUrl);
        break;
      case 'minor':
        await this.showUpdateModal(evaluation, storeUrl, false);
        break;
      case 'major':
        await this.showUpdateModal(evaluation, storeUrl, true);
        break;
    }
  }

  // ── Patch (toast) ───────────────────────────────────────────────────────────

  private async handlePatchUpdate(
    evaluation: WmUpdateEvaluation,
    storeUrl: string | null,
  ): Promise<void> {
    const key = `${UPDATE_PATCH_KEY_PREFIX}${evaluation.storeVersion ?? 'unknown'}`;

    // Mostra al massimo una volta ogni UPDATE_PATCH_INTERVAL_MS (24 h)
    if (typeof localStorage !== 'undefined') {
      if (this.isThrottled(key, localStorage, UPDATE_PATCH_INTERVAL_MS)) {
        return;
      }
      this.markShown(key, localStorage);
    }

    const baseMessage = this._langSvc.instant("È disponibile una nuova versione dell'app.");
    const message =
      evaluation.storeVersion && evaluation.currentVersion
        ? `${baseMessage} (${evaluation.storeVersion})`
        : baseMessage;

    try {
      const toast = await this._toastController.create({
        header: this._langSvc.instant('Aggiornamento disponibile'),
        message,
        icon: 'cloud-download-outline',
        position: 'bottom',
        layout: 'stacked',
        animated: true,
        cssClass: 'wm-update-toast',
        buttons: [
          {
            text: this._langSvc.instant('Aggiorna ora'),
            role: 'update',
            handler: () => {
              if (storeUrl) {
                this.openStoreUrl(storeUrl);
              }
            },
          },
          {
            text: this._langSvc.instant('Info'),
            role: 'info',
            handler: () => {
              this.showUpdateModal(evaluation, storeUrl, false);
            },
          },
          {
            text: this._langSvc.instant('Chiudi'),
            role: 'cancel',
          },
        ],
      });
      await toast.present();
    } catch {}
  }

  // ── Minor / Major (modal) ──────────────────────────────────────────────────

  /**
   * Mostra il modal di aggiornamento.
   * Se `mandatory` è true (major) il modal non è chiudibile dall'utente.
   */
  private async showUpdateModal(
    evaluation: WmUpdateEvaluation,
    storeUrl: string | null,
    mandatory: boolean,
  ): Promise<void> {
    if (mandatory) {
      // Major: salva il timestamp (nessun throttle, si mostra sempre)
      if (typeof localStorage !== 'undefined') {
        this.markShown(`${UPDATE_MAJOR_KEY_PREFIX}${evaluation.minVersion ?? 'unknown'}`, localStorage);
      }
    } else {
      // Minor: throttle ogni UPDATE_MINOR_INTERVAL_MS (6 h)
      const key = `${UPDATE_MINOR_KEY_PREFIX}${evaluation.storeVersion ?? 'unknown'}`;
      if (typeof localStorage !== 'undefined') {
        if (this.isThrottled(key, localStorage, UPDATE_MINOR_INTERVAL_MS)) {
          return;
        }
        this.markShown(key, localStorage);
      }
    }

    const releaseNotes = await this.fetchReleaseNotes(evaluation);

    try {
      const modal = await this._modalController.create({
        component: ModalReleaseUpdateComponent,
        componentProps: {
          gitVersion: evaluation.storeVersion ?? evaluation.minVersion,
          mandatory,
          releaseNotes,
          storeUrl,
        },
        backdropDismiss: !mandatory,
        showBackdrop: true,
      });
      await modal.present();
    } catch {
      if (storeUrl) {
        this.openStoreUrl(storeUrl);
      }
    }
  }

  // ── Store URL ───────────────────────────────────────────────────────────────

  async openStoreUrl(storeUrl: string | null): Promise<void> {
    if (!storeUrl) {
      try {
        const alert = await this._alertController.create({
          header: this._langSvc.instant('Store non disponibile'),
          message: this._langSvc.instant(
            "Non è stato possibile aprire direttamente lo store. Prova ad aprire manualmente la pagina dell'app nello store.",
          ),
          buttons: ['OK'],
        });
        await alert.present();
      } catch {}
      return;
    }
    window.open(storeUrl, '_blank', 'noopener,noreferrer');
  }

  // ── Helpers privati ─────────────────────────────────────────────────────────

  private getMinVersionFromConfig(appConfig: APP): string | null {
    if (!appConfig) {
      return null;
    }
    return appConfig.minAppVersion ?? null;
  }

  private resolveStoreUrl(appConfig: APP): string | null {
    if (this._deviceService.isAndroid) {
      return appConfig.androidStore ?? null;
    }
    if (this._deviceService.isIos) {
      return appConfig.iosStore ?? null;
    }
    return null;
  }
}
