import {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {Photo} from '@capacitor/camera';
import {Capacitor} from '@capacitor/core';
import {AlertController} from '@ionic/angular';
import {firstValueFrom} from 'rxjs';
import {Media} from '@wm-types/feature';
import {LangService} from '@wm-core/localization/lang.service';
import {CaptureOptions} from '@wm-core/services/camera.service';
import {PassportLeaveGuard} from '@wm-core/passport/passport-leave-guard';
import {Experience} from '../experience.model';
import {ExperienceService} from '../experience.service';
import {resizeImageBlob} from '../experience-photo.utils';

/** Foto massime di un'esperienza (oc:8169). */
export const EXPERIENCE_MAX_PHOTOS = 6;
/** Acquisizione delle foto di un'esperienza: ridotte e senza accendere il GPS. */
export const EXPERIENCE_PHOTO_CAPTURE: CaptureOptions = {
  maxWidth: 1600,
  quality: 80,
  startNavigation: false,
};

/** Operazioni del contenitore usate dal form. */
export interface ExperienceFormHost {
  back(): void;
  registerGuard?(guard: PassportLeaveGuard | null): void;
}

/**
 * Form di creazione e modifica di un'esperienza (oc:8169): racconto e fino a 6 foto. Invio solo
 * online: in caso di errore testo e foto restano nel form. Con contenuto non pubblicato l'uscita
 * chiede conferma, tramite il guard registrato sul contenitore.
 */
@Component({
  standalone: false,
  selector: 'wm-experience-form',
  templateUrl: './experience-form.component.html',
  styleUrls: ['./experience-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmExperienceFormComponent implements OnInit, OnDestroy, PassportLeaveGuard {
  @Input() layerId?: number;
  @Input() ecTrackId?: number;
  @Input() contextLabel = '';
  @Input() host?: ExperienceFormHost;
  @Input() set experience(experience: Experience | undefined) {
    this._experience = experience;
    this.description = experience?.description ?? '';
    this.keepMediaIds = (experience?.photos ?? []).map(p => p.id);
    this.syncedPhotos = (experience?.photos ?? []).map(
      p => ({id: p.id, webPath: p.thumbnail || p.url, format: 'jpeg'}) as Media,
    );
  }
  get experience(): Experience | undefined {
    return this._experience;
  }

  readonly maxPhotos = EXPERIENCE_MAX_PHOTOS;
  readonly captureOptions = EXPERIENCE_PHOTO_CAPTURE;

  description = '';
  newPhotos: Photo[] = [];
  /** Foto già pubblicate mostrate dal picker (solo in modifica). */
  syncedPhotos: Media[] = [];
  /** Id delle foto già pubblicate da mantenere (solo in modifica). */
  keepMediaIds: number[] = [];
  submitting = false;
  /** Messaggio d'errore dell'ultimo invio, `null` se non ce n'è. */
  errorMessage: string | null = null;
  /** `true` se l'ultimo errore è mancanza di connessione (mostra «Riprova»). */
  networkError = false;

  /** Generato una volta sola: un nuovo invio dopo un errore non crea un duplicato. */
  private readonly _uuid = this._newUuid();
  private _experience?: Experience;
  /** `true` dopo un invio riuscito: l'uscita non chiede più conferma. */
  private _done = false;

  constructor(
    private _experienceSvc: ExperienceService,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
  ) {}

  /** Titolo: «Nuova esperienza» in creazione, «Modifica esperienza» in modifica. */
  get title(): string {
    return this._experience ? 'Modifica esperienza' : 'Nuova esperienza';
  }

  /** Segnaposto del racconto: della tappa se il form è aperto da una tappa, altrimenti del cammino. */
  get placeholder(): string {
    return this.ecTrackId != null
      ? "Com'è andata? Cosa ti porti a casa da questa tappa?"
      : "Com'è andata? Cosa ti porti a casa da questo cammino?";
  }

  /** Foto totali del form: nuove più quelle già pubblicate mantenute. */
  get photosCount(): number {
    return this.newPhotos.length + this.keepMediaIds.length;
  }

  /** Invio possibile: almeno un testo non vuoto o una foto, e nessun invio in corso. */
  get canSubmit(): boolean {
    return (this.description.trim().length > 0 || this.photosCount > 0) && !this.submitting;
  }

  /** Il form ha contenuto non pubblicato (in modifica: diverso dall'esperienza salvata). */
  get isDirty(): boolean {
    if (!this._experience) return this.description.trim().length > 0 || this.newPhotos.length > 0;
    const original = this._experience.photos.map(p => p.id);
    return (
      this.description !== (this._experience.description ?? '') ||
      this.newPhotos.length > 0 ||
      this.keepMediaIds.length !== original.length
    );
  }

  /** Chiude il form chiedendo conferma se c'è contenuto non pubblicato. */
  async close(): Promise<void> {
    if (await this.canLeave()) this.host?.back();
  }

  /** Si registra come guard sul contenitore. */
  ngOnInit(): void {
    this.host?.registerGuard?.(this);
  }

  /** Si toglie da guard del contenitore. */
  ngOnDestroy(): void {
    this.host?.registerGuard?.(null);
  }

  /**
   * Aggiorna il testo.
   *
   * @param value Testo corrente della textarea.
   */
  onDescription(value: string | null | undefined): void {
    this.description = value ?? '';
    this._cdr.markForCheck();
  }

  /**
   * Aggiorna le foto nuove scelte nel picker. Il picker emette la lista combinata (locali e
   * sincronizzate): le sincronizzate hanno un `id`, le nuove no, quindi si tengono solo queste.
   *
   * @param photos Foto correnti del picker.
   */
  onPhotos(photos: Photo[]): void {
    this.newPhotos = (photos ?? []).filter(p => (p as Media).id == null);
    this._cdr.markForCheck();
  }

  /**
   * Toglie dal form una foto già pubblicata.
   *
   * @param id Id del media tolto.
   */
  onSyncedPhotoRemoved(id: number): void {
    this.keepMediaIds = this.keepMediaIds.filter(k => k !== id);
    this._cdr.markForCheck();
  }

  /** Pubblica (creazione) o salva (modifica); in caso di errore il form resta aperto. */
  async submit(): Promise<void> {
    if (!this.canSubmit) return;
    this.submitting = true;
    this.errorMessage = null;
    this.networkError = false;
    this._cdr.markForCheck();
    try {
      const photos = await Promise.all(this.newPhotos.map(p => this._toBlob(p)));
      const draft = {
        uuid: this._experience?.uuid ?? this._uuid,
        layerId: this.layerId,
        ecTrackId: this.ecTrackId,
        description: this.description.trim(),
        newPhotos: photos,
        ...(this._experience ? {keepMediaIds: this.keepMediaIds} : {}),
      };
      await firstValueFrom(
        this._experience
          ? this._experienceSvc.update(this._experience.id, draft)
          : this._experienceSvc.create(draft),
      );
      this._done = true;
      this.host?.back();
    } catch (err) {
      this.networkError = this._isOffline(err);
      this.errorMessage = this._langSvc.instant(this._errorKey(err));
    } finally {
      this.submitting = false;
      this._cdr.markForCheck();
    }
  }

  /**
   * Con testo o foto non pubblicati chiede conferma prima di uscire.
   *
   * @returns `true` se si può uscire.
   */
  async canLeave(): Promise<boolean> {
    // un invio in corso (anche senza modifiche) chiude lui il form: un'altra uscita sarebbe un doppio pop
    if (this.submitting) return false;
    if (this._done || !this.isDirty) return true;
    const alert = await this._alertCtrl.create({
      header: this._langSvc.instant('Vuoi uscire?'),
      message: this._langSvc.instant('Il testo e le foto non pubblicati andranno persi.'),
      buttons: [
        {text: this._langSvc.instant('Esci'), role: 'confirm'},
        {text: this._langSvc.instant('Continua a scrivere'), role: 'cancel'},
      ],
    });
    await alert.present();
    const {role} = await alert.onDidDismiss();
    return role === 'confirm';
  }

  /**
   * Chiave del messaggio d'errore dell'invio.
   *
   * @param err Errore dell'invio.
   * @returns La chiave i18n: connessione assente, il campo rifiutato da un 422 o errore generico.
   */
  private _errorKey(err: unknown): string {
    if (this.networkError) {
      return 'Nessuna connessione. Il tuo racconto e le foto restano qui: riprova quando sei online.';
    }
    if (err instanceof HttpErrorResponse && err.status === 422) {
      // Il messaggio segue il campo rifiutato dal backend: il suo testo è sempre in italiano,
      // la chiave qui invece si traduce nella lingua dell'app.
      const fields = Object.keys(err.error?.errors ?? {});
      if (fields.some(f => f === 'ec_track_id' || f === 'layer_id')) {
        return 'La tappa non appartiene a questo cammino.';
      }
      if (fields.includes('description')) {
        return 'Scrivi un testo o aggiungi almeno una foto.';
      }
      if (fields.some(f => f === 'images' || f.startsWith('images.'))) {
        return 'Una o più foto non sono valide: usa JPEG, PNG o WebP fino a 5 MB.';
      }
    }
    return 'Invio non riuscito, riprova';
  }

  /**
   * Indica se l'errore è mancanza di connessione.
   *
   * @param err Errore dell'invio.
   * @returns `true` per uno status 0 o con il dispositivo offline.
   */
  private _isOffline(err: unknown): boolean {
    if (err instanceof HttpErrorResponse && err.status === 0) return true;
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  /**
   * Converte una foto del picker in Blob per il multipart. Sul web il picker restituisce il file
   * originale: lo si riduce qui (lato lungo 1600 px, JPEG 0.8), come fa la camera su nativo.
   *
   * @param photo Foto Capacitor con `webPath`.
   * @returns Il contenuto della foto.
   */
  private async _toBlob(photo: Photo): Promise<Blob> {
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    return this._isNative() ? blob : resizeImageBlob(blob);
  }

  /** `true` su app nativa: avvolto per poterlo sostituire negli spec (Capacitor è un Proxy). */
  private _isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** Identificativo univoco dell'invio, lato client. */
  private _newUuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
