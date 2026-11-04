import {HttpErrorResponse} from '@angular/common/http';
import {
  Optional,
  ViewChild,
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
import {AlertController, ToastController} from '@ionic/angular';
import {Subscription, firstValueFrom} from 'rxjs';
import {Media} from '@wm-types/feature';
import {LangService} from '@wm-core/localization/lang.service';
import {CaptureOptions} from '@wm-core/services/camera.service';
import {PassportLeaveGuard} from '@wm-core/passport/passport-leave-guard';
import {
  Diary,
  DiaryDraft,
  DiaryRatingKey,
  DiaryRatings,
  EMPTY_DIARY_RATINGS,
  normalizeDiaryRatings,
  sameDiaryRatings,
} from '../diary.model';
import {DiaryService} from '../diary.service';
import {DiaryDraftKey, DiaryDraftStore, diaryDraftKey} from '../diary-draft.store';
import {DiaryOutboxService} from '../diary-outbox.service';
import {diaryHttpErrorKey} from '../diary-offline.utils';
import {resizeImageBlob} from '../diary-photo.utils';
import {DIARY_MAX_VISIBLE, diaryVisibleLength} from '../diary-text.utils';
import {PassportService} from '../../passport/passport.service';
import {intlLocale, todayLocal} from '../../passport/passport.utils';
import {DateRange, formatDateRange} from '../../shared/date-range-picker/date-range.utils';
import {WmDateRangePickerComponent} from '../../shared/date-range-picker/date-range-picker.component';
import {diaryKnownWalk, walksNear} from '../diary-route-data.utils';

/** Foto massime di un'esperienza (oc:8169). */
export const DIARY_MAX_PHOTOS = 6;
/** Acquisizione delle foto di un'esperienza: ridotte e senza accendere il GPS. */
export const DIARY_PHOTO_CAPTURE: CaptureOptions = {
  maxWidth: 1600,
  quality: 80,
  startNavigation: false,
};

/** Operazioni del contenitore usate dal form. */
export interface DiaryFormHost {
  back(): void;
  registerGuard?(guard: PassportLeaveGuard | null): void;
}

/**
 * Form di creazione e modifica di un'esperienza (oc:8169): racconto e fino a 6 foto. Invio solo
 * online: in caso di errore testo e foto restano nel form. Con contenuto non pubblicato l'uscita
 * chiede conferma, tramite il guard registrato sul contenitore.
 */
/** Conferma del passaggio in coda di un diario scritto senza rete. */
export const DIARY_QUEUED_MESSAGE = 'Sei offline: il diario partirà appena torni online';
/** Pausa nella scrittura dopo cui si salva la bozza del testo (ms). */
export const DIARY_DRAFT_DEBOUNCE_MS = 800;

@Component({
  standalone: false,
  selector: 'wm-diary-form',
  templateUrl: './diary-form.component.html',
  styleUrls: ['./diary-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDiaryFormComponent implements OnInit, OnDestroy, PassportLeaveGuard {
  @Input() layerId?: number;
  @Input() ecTrackId?: number;
  @Input() contextLabel = '';
  @Input() host?: DiaryFormHost;
  @Input() set diary(diary: Diary | undefined) {
    this._diary = diary;
    this.description = diary?.description ?? '';
    this.textLength = diaryVisibleLength(this.description);
    this.keepMediaIds = (diary?.photos ?? []).map(p => p.id);
    this.publicationConsent = diary?.publicationConsent === true;
    this.ratings = normalizeDiaryRatings(diary?.ratings);
    this.syncedPhotos = (diary?.photos ?? []).map(
      p => ({id: p.id, webPath: p.thumbnail || p.url, format: 'jpeg'}) as Media,
    );
  }
  get diary(): Diary | undefined {
    return this._diary;
  }

  readonly maxPhotos = DIARY_MAX_PHOTOS;
  readonly captureOptions = DIARY_PHOTO_CAPTURE;

  description = '';
  /** Spunta facoltativa del consenso alla ripubblicazione, non selezionata di default. */
  publicationConsent = false;
  /** Valutazioni facoltative da 1 a 5 (oc:8169, ciclo 2). */
  ratings: Required<DiaryRatings> = {...EMPTY_DIARY_RATINGS};
  /**
   * Righe delle valutazioni: sulla tappa la prima è «Tappa». Lo stesso array finché l'etichetta
   * non cambia: un array nuovo a ogni ciclo farebbe ricreare `wm-diary-rating` da `*ngFor` a ogni
   * tocco, e l'animazione partirebbe su timbri già tolti dalla pagina.
   */
  get ratingRows(): {key: DiaryRatingKey; label: string}[] {
    const first = this.ecTrackId != null || this._diary?.ecTrack ? 'Tappa' : 'Cammino';
    if (this._ratingRows?.[0].label !== first) {
      this._ratingRows = [
        {key: 'route', label: first},
        {key: 'hospitality', label: 'Ospitalità'},
        {key: 'difficulty', label: 'Difficoltà percepita'},
      ];
    }
    return this._ratingRows;
  }

  /**
   * Identità delle righe delle valutazioni per `*ngFor`.
   * @param _ indice
   * @param row riga
   * @returns la chiave della valutazione
   */
  trackRating(_: number, row: {key: DiaryRatingKey}): DiaryRatingKey {
    return row.key;
  }

  private _ratingRows: {key: DiaryRatingKey; label: string}[] | null = null;
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

  /**
   * Generato una volta sola: un nuovo invio dopo un errore non crea un duplicato. Se c'è una
   * bozza dello stesso contesto si riusa il suo, per lo stesso motivo (oc:8169, ciclo 2).
   */
  private _uuid = this._newUuid();
  /** Chiave della bozza sul telefono; `null` finché non si conosce l'utente o se non è loggato. */
  private _draftKey: DiaryDraftKey | null = null;
  private _draftUserId: number | null = null;
  private _draftTimer: ReturnType<typeof setTimeout> | null = null;
  /** Foto convertite all'ultimo cambio delle foto: il salvataggio del solo testo le riusa. */
  private _photoBlobs: Blob[] | null = null;
  /** Foto della bozza da ripristinare nel picker. */
  restoredPhotos: Media[] = [];
  /** Si risolve quando la bozza (se c'è) è stata ripristinata. */
  draftReady: Promise<void> = Promise.resolve();
  private _diary?: Diary;
  /** `true` dopo un invio riuscito: l'uscita non chiede più conferma. */
  private _done = false;

  constructor(
    private _diarySvc: DiaryService,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
    private _drafts: DiaryDraftStore,
    private _outbox: DiaryOutboxService,
    private _toastCtrl: ToastController,
    @Optional() private _passportSvc?: PassportService,
  ) {}

  /** Date di percorrenza toccate dall'utente (ciclo 4): solo allora si salvano e si inviano. */
  walkTouched = false;
  /** Date scelte nel campo, `null` se svuotato. */
  walkDates: DateRange | null = null;
  /** Ultima percorrenza nota dal Passaporto, per precompilare e per l'avviso. */
  knownWalk: DateRange | null = null;
  /** Ultimo giorno selezionabile. */
  readonly today = todayLocal();
  private _progressSub?: Subscription;
  @ViewChild(WmDateRangePickerComponent) private _picker?: WmDateRangePickerComponent;

  /** @returns il valore del campo: le date toccate, altrimenti quelle del diario, altrimenti l'ultima percorrenza */
  get walkValue(): DateRange | null {
    return this.walkTouched ? this.walkDates : (this._diary?.walkDates ?? this.knownWalk);
  }

  /** @returns `true` se le date scelte non toccano l'ultima percorrenza entro un giorno */
  get walkFar(): boolean {
    return this.walkTouched && !!this.walkDates && !!this.knownWalk && !walksNear(this.walkDates, this.knownWalk);
  }

  /** @returns l'ultima percorrenza per esteso, per l'avviso */
  get knownWalkLabel(): string {
    return formatDateRange(this.knownWalk, intlLocale(this._langSvc.currentLang));
  }

  /**
   * Ultima percorrenza nota: precompila il campo se non è stato toccato.
   *
   * @param walk Periodo, `null` se non noto.
   */
  setKnownWalk(walk: DateRange | null): void {
    this.knownWalk = walk;
    this._cdr.markForCheck();
  }

  /**
   * Chiude il foglio del calendario se è aperto: il back hardware del diario ha priorità sopra 100 e
   * il foglio non lo riceverebbe (come nella richiesta cartacea, oc:8761).
   *
   * @returns `true` se il calendario era aperto e l'ha chiuso.
   */
  closeOverlay(): Promise<boolean> {
    if (!this._picker?.isOpen) return Promise.resolve(false);
    this._picker.cancel();
    return Promise.resolve(true);
  }

  /**
   * Date scelte o svuotate nel calendario.
   *
   * @param range Periodo, `null` se svuotato.
   */
  onWalkDates(range: DateRange | null): void {
    this.walkTouched = true;
    this.walkDates = range;
    this._scheduleDraftSave();
    this._cdr.markForCheck();
  }

  /** Titolo: «Nuova esperienza» in creazione, «Modifica esperienza» in modifica. */
  get title(): string {
    return this._diary ? 'Modifica il diario' : 'Nuova pagina di diario';
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
    // testo visibile, non la stringa HTML: `<p>&nbsp;</p>` o una sola linea non sono un racconto
    return (this.textLength > 0 || this.photosCount > 0) && !this.submitting && !this.overLimit;
  }

  /** Caratteri di testo visibile del racconto, dal contatore dell'editor (oc:8169, ciclo 3). */
  textLength = 0;
  /** Limite del testo visibile. */
  readonly maxTextLength = DIARY_MAX_VISIBLE;

  /** @returns `true` oltre il limite del testo visibile */
  get overLimit(): boolean {
    return this.textLength > this.maxTextLength;
  }

  /** @returns `true` dal 90% del limite: solo allora il contatore si annuncia agli screen reader */
  get counterLive(): boolean {
    return this.textLength >= this.maxTextLength * 0.9;
  }

  /**
   * Aggiorna il contatore.
   *
   * @param length Caratteri di testo visibile.
   */
  onLength(length: number): void {
    this.textLength = length;
    this._cdr.markForCheck();
  }

  /** Il form ha contenuto non pubblicato (in modifica: diverso dall'esperienza salvata). */
  get isDirty(): boolean {
    if (!this._diary) return this.description.trim().length > 0 || this.newPhotos.length > 0;
    const original = this._diary.photos.map(p => p.id);
    return (
      this.description !== (this._diary.description ?? '') ||
      this.newPhotos.length > 0 ||
      this.keepMediaIds.length !== original.length ||
      this.publicationConsent !== (this._diary.publicationConsent === true) ||
      !sameDiaryRatings(this.ratings, normalizeDiaryRatings(this._diary.ratings)) ||
      (this.walkTouched && JSON.stringify(this.walkDates) !== JSON.stringify(this._diary.walkDates ?? null))
    );
  }

  /** Chiude il form chiedendo conferma se c'è contenuto non pubblicato. */
  async close(): Promise<void> {
    if (await this.canLeave()) this.host?.back();
  }

  /** Si registra come guard sul contenitore. */
  ngOnInit(): void {
    this.host?.registerGuard?.(this);
    this.draftReady = this._restoreDraft();
    if (this._passportSvc && this.layerId != null) {
      this._progressSub = this._passportSvc
        .progress$(this.layerId)
        .subscribe(progress => this.setKnownWalk(diaryKnownWalk(progress, this.ecTrackId ?? null)));
    }
  }

  /** Si toglie da guard del contenitore. */
  ngOnDestroy(): void {
    this.host?.registerGuard?.(null);
    if (this._draftTimer) clearTimeout(this._draftTimer);
    this._progressSub?.unsubscribe();
  }

  /**
   * Aggiorna il testo.
   *
   * @param value Testo corrente della textarea.
   */
  onDescription(value: string | null | undefined): void {
    this.description = value ?? '';
    this.textLength = diaryVisibleLength(this.description);
    this._scheduleDraftSave();
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
    this._photoBlobs = null;
    void this.flushDraft();
    this._cdr.markForCheck();
  }

  /**
   * Toglie dal form una foto già pubblicata.
   *
   * @param id Id del media tolto.
   */
  onSyncedPhotoRemoved(id: number): void {
    this.keepMediaIds = this.keepMediaIds.filter(k => k !== id);
    void this.flushDraft();
    this._cdr.markForCheck();
  }

  /**
   * Aggiorna la spunta del consenso alla ripubblicazione.
   * @param checked nuovo valore della spunta
   */
  onPublicationConsent(checked: boolean): void {
    this.publicationConsent = checked === true;
    void this.flushDraft();
  }

  /**
   * Aggiorna una valutazione.
   * @param key valutazione
   * @param value nuovo valore, `null` se azzerata
   */
  onRating(key: DiaryRatingKey, value: number | null): void {
    this.ratings = {...this.ratings, [key]: value};
    void this.flushDraft();
    this._cdr.markForCheck();
  }

  /** Pubblica (creazione) o salva (modifica); in caso di errore il form resta aperto. */
  async submit(): Promise<void> {
    if (!this.canSubmit) return;
    this.submitting = true;
    this.errorMessage = null;
    this.networkError = false;
    this._cdr.markForCheck();
    let draftForQueue: DiaryDraft | null = null;
    try {
      const photos = await Promise.all(this.newPhotos.map(p => this._toBlob(p)));
      const draft: DiaryDraft = {
        uuid: this._diary?.uuid ?? this._uuid,
        layerId: this.layerId,
        ecTrackId: this.ecTrackId,
        description: this.description.trim(),
        newPhotos: photos,
        publicationConsent: this.publicationConsent,
        ratings: {...this.ratings},
        walkDates: this.walkTouched ? this.walkDates : undefined,
        ...(this._diary ? {keepMediaIds: this.keepMediaIds} : {}),
      };
      draftForQueue = draft;
      await firstValueFrom(
        this._diary
          ? this._diarySvc.update(this._diary.id, draft)
          : this._diarySvc.create(draft),
      );
      this._done = true;
      await this._removeDraft();
      this.host?.back();
    } catch (err) {
      if (await this._enqueueIfOffline(err, draftForQueue)) return;
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
    if (role === 'confirm') await this._removeDraft();
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
    return diaryHttpErrorKey(err);
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
   * Salva subito la bozza sul telefono (testo dopo una pausa, foto e spunta subito).
   * @returns quando la bozza è salvata
   */
  async flushDraft(): Promise<void> {
    if (this._draftTimer) {
      clearTimeout(this._draftTimer);
      this._draftTimer = null;
    }
    if (!this._draftKey || this._draftUserId == null || this._done) return;
    if (this._photoBlobs == null) {
      this._photoBlobs = await Promise.all(this.newPhotos.map(p => this._toBlob(p)));
    }
    const photos = this._photoBlobs;
    // pubblicato o messo in coda mentre si convertivano le foto: la bozza non va riscritta
    if (this._done) return;
    await this._drafts
      .save({
        key: this._draftKey,
        userId: this._draftUserId,
        uuid: this._diary?.uuid ?? this._uuid,
        layerId: this.layerId,
        ecTrackId: this.ecTrackId,
        diaryId: this._diary?.id,
        description: this.description,
        photos,
        keepMediaIds: this._diary ? this.keepMediaIds : undefined,
        publicationConsent: this.publicationConsent,
        ratings: {...this.ratings},
        walkDates: this.walkTouched ? this.walkDates : undefined,
        updatedAt: Date.now(),
      })
      .catch(() => undefined);
  }

  /**
   * Senza rete un diario nuovo va in coda e parte da solo al ritorno della rete (oc:8169, ciclo 2).
   * Solo dove la coda è attiva (app camminiditalia); la modifica resta bloccata come prima.
   * @param err errore dell'invio
   * @param draft dati del diario
   * @returns `true` se il diario è andato in coda e il form si è chiuso
   */
  private async _enqueueIfOffline(err: unknown, draft: DiaryDraft | null): Promise<boolean> {
    if (this._diary || !draft || !this._outbox.active || this._draftUserId == null) return false;
    if (!this._isOffline(err)) return false;
    await this._outbox.enqueue(draft, this._draftUserId);
    this._done = true;
    await this._removeDraft();
    const toast = await this._toastCtrl.create({
      message: this._langSvc.instant(DIARY_QUEUED_MESSAGE),
      duration: 3000,
    });
    await toast.present();
    this.host?.back();
    return true;
  }

  /** Salvataggio del testo dopo una pausa nella scrittura. */
  private _scheduleDraftSave(): void {
    if (this._draftTimer) clearTimeout(this._draftTimer);
    this._draftTimer = setTimeout(() => void this.flushDraft(), DIARY_DRAFT_DEBOUNCE_MS);
  }

  /** Ripristina la bozza dello stesso contesto, se c'è (oc:8169, ciclo 2). */
  private async _restoreDraft(): Promise<void> {
    const userId = await firstValueFrom(this._diarySvc.currentUserId$()).catch(() => null);
    if (userId == null) return;
    this._draftUserId = userId;
    this._draftKey = diaryDraftKey(userId, {
      layerId: this.layerId,
      ecTrackId: this.ecTrackId,
      diaryId: this._diary?.id,
    });
    const draft = await this._drafts.load(this._draftKey).catch(() => null);
    if (!draft) return;
    this.description = draft.description ?? '';
    this.textLength = diaryVisibleLength(this.description);
    this.publicationConsent = draft.publicationConsent === true;
    if (draft.ratings) this.ratings = normalizeDiaryRatings(draft.ratings);
    if (draft.walkDates !== undefined) {
      this.walkTouched = true;
      this.walkDates = draft.walkDates;
    }
    if (draft.errorMessage) this.errorMessage = this._langSvc.instant(draft.errorMessage);
    if (!this._diary && draft.uuid) this._uuid = draft.uuid;
    if (this._diary && draft.keepMediaIds) this.keepMediaIds = draft.keepMediaIds;
    this.restoredPhotos = (draft.photos ?? []).map(
      blob => ({webPath: URL.createObjectURL(blob), format: 'jpeg'}) as Media,
    );
    this.newPhotos = this.restoredPhotos as unknown as Photo[];
    this._cdr.markForCheck();
  }

  /** Cancella la bozza: dopo la pubblicazione, l'uscita confermata o il passaggio in coda. */
  private async _removeDraft(): Promise<void> {
    if (this._draftTimer) {
      clearTimeout(this._draftTimer);
      this._draftTimer = null;
    }
    if (this._draftKey) await this._drafts.remove(this._draftKey).catch(() => undefined);
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
