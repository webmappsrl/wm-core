import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {FormControl, FormGroup} from '@angular/forms';
import {AlertController, ToastController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Photo} from '@capacitor/camera';
import {Subscription, firstValueFrom} from 'rxjs';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '../passport.service';
import {PASSPORT_MAX_PHOTOS, PASSPORT_MIN_PHOTOS, PASSPORT_PHOTO_CAPTURE} from '../passport.constants';
import {PassportLeaveGuard} from '../passport-leave-guard';
import {formatDateForLang, intlLocale, isEndBeforeStart, toIsoDate, todayLocal} from '../passport.utils';

/** Campo data del form aperto nel calendario (oc:8761). */
export type PassportDateField = 'start' | 'end';

/** Operazioni della modale host usate dal form. */
export interface PassportFormHost {
  registerGuard(guard: PassportLeaveGuard | null): void;
  back(): Promise<void>;
  backToDetail(): Promise<void>;
}

/**
 * Form di richiesta di certificazione della credenziale cartacea (oc:8166, wireframe V2).
 * Invio solo online: in caso di errore le foto restano nel form. Con foto non inviate ogni
 * uscita chiede conferma, tramite il guard registrato sulla modale host.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-form',
  templateUrl: './passport-form.component.html',
  styleUrls: ['./passport-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportFormComponent implements OnInit, OnDestroy, PassportLeaveGuard {
  @Input() layerId: number;
  @Input() host: PassportFormHost;

  readonly maxPhotos = PASSPORT_MAX_PHOTOS;
  readonly captureOptions = PASSPORT_PHOTO_CAPTURE;
  readonly needsPrivacyAgree$ = this._store.select(needsPrivacyAgree);

  form = new FormGroup({
    serialNumber: new FormControl<string>(''),
    disclaimer: new FormControl<boolean>(false, {nonNullable: true}),
    startDate: new FormControl<string | null>(null),
    endDate: new FormControl<string | null>(null),
  });
  photos: Photo[] = [];
  submitting = false;
  /** Gli errori di validazione compaiono solo dopo il primo tentativo d'invio. */
  triedSubmit = false;
  /** Campo data in modifica nel calendario, `null` se il calendario è chiuso (oc:8761). */
  editing: PassportDateField | null = null;
  /** Data `AAAA-MM-GG` scelta nel calendario e non ancora confermata, `null` a calendario chiuso. */
  pendingDate: string | null = null;
  /**
   * Ultimo campo aperto nel calendario: tiene titolo e limite minimo del foglio stabili anche durante
   * l'animazione di chiusura, quando `editing` è già `null`.
   */
  calendarField: PassportDateField = 'start';
  /** Data locale del dispositivo all'apertura del form, `AAAA-MM-GG`: limite massimo delle date. */
  readonly today = todayLocal();

  private _needsPrivacy = false;
  private _logged = false;
  private _subs = new Subscription();
  /** `true` dopo una chiusura da codice: il suo `didDismiss` in arrivo va ignorato. */
  private _dismissExpected = false;

  constructor(
    private _passportSvc: PassportService,
    private _store: Store,
    private _alertCtrl: AlertController,
    private _toastCtrl: ToastController,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
  ) {}

  /** Numero di foto valido: almeno il minimo, non oltre il massimo. */
  get photosValid(): boolean {
    return this.photos.length >= PASSPORT_MIN_PHOTOS && this.photos.length <= PASSPORT_MAX_PHOTOS;
  }

  /** Date di percorrenza valide: entrambe scelte e la fine non precede l'inizio (oc:8761). */
  get datesValid(): boolean {
    const {startDate, endDate} = this.form.controls;
    return !!startDate.value && !!endDate.value && !isEndBeforeStart(startDate.value, endDate.value);
  }

  /** Campo «Dal» da segnalare in errore: dopo un tentativo d'invio, se è vuoto. */
  get startDateInvalid(): boolean {
    return this.triedSubmit && !this.form.controls.startDate.value;
  }

  /** Campo «Al» da segnalare in errore: dopo un tentativo d'invio, se è vuoto o precede l'inizio. */
  get endDateInvalid(): boolean {
    const {startDate, endDate} = this.form.controls;
    return this.triedSubmit && (!endDate.value || (!!startDate.value && isEndBeforeStart(startDate.value, endDate.value)));
  }

  /** Lingua del calendario per `ion-datetime`: quella dell'app, non quella del telefono. */
  get locale(): string {
    return intlLocale(this._langSvc.currentLang);
  }

  /**
   * Valore da cui si apre il calendario: la data dell'ultimo campo aperto, altrimenti oggi. Legge
   * `calendarField` e non `editing`, così resta stabile durante l'animazione di chiusura del foglio.
   */
  get calendarValue(): string {
    const control = this.calendarField === 'end' ? this.form.controls.endDate : this.form.controls.startDate;
    return control.value ?? this.today;
  }

  /**
   * Invio possibile: foto valide, date valide, disclaimer accettato, utente loggato con consenso,
   * nessun invio in corso.
   */
  get canSubmit(): boolean {
    return (
      this.photosValid &&
      this.datesValid &&
      this.form.controls.disclaimer.value === true &&
      this._logged &&
      !this._needsPrivacy &&
      !this.submitting
    );
  }

  /** Si registra come guard sull'host e segue consenso e login. */
  ngOnInit(): void {
    this.host?.registerGuard(this);
    this._subs.add(this.needsPrivacyAgree$.subscribe(v => (this._needsPrivacy = v)));
    this._subs.add(this._store.select(isLogged).subscribe(v => (this._logged = v)));
  }

  /**
   * Aggiorna le foto scelte nel picker.
   *
   * @param photos Foto correnti del picker.
   */
  onPhotos(photos: Photo[]): void {
    this.photos = photos ?? [];
    this._cdr.markForCheck();
  }

  /**
   * Apre il calendario per il campo data indicato, partendo dal valore del campo o da oggi.
   *
   * @param field Campo da modificare.
   */
  openCalendar(field: PassportDateField): void {
    this.editing = field;
    this.calendarField = field;
    this.pendingDate = this.calendarValue;
    this._cdr.markForCheck();
  }

  /**
   * Aggiorna la data scelta nel calendario senza applicarla al campo: senza i bottoni di default
   * `ionChange` parte a ogni tocco di un giorno, la data si applica solo con «Conferma».
   *
   * @param value Valore di `ionChange` di `ion-datetime` (ISO, con o senza orario).
   */
  onDatePicked(value: string | string[] | null | undefined): void {
    const picked = Array.isArray(value) ? value[0] : value;
    if (!picked || this.editing === null) return;
    this.pendingDate = toIsoDate(picked);
    this._cdr.markForCheck();
  }

  /**
   * Applica la data scelta al campo in modifica e chiude il calendario. Se l'inizio supera una fine
   * già scelta, la fine si svuota.
   */
  confirmDate(): void {
    const date = this.pendingDate;
    if (date && this.editing !== null) {
      const {startDate, endDate} = this.form.controls;
      if (this.editing === 'start') {
        startDate.setValue(date);
        if (endDate.value && isEndBeforeStart(date, endDate.value)) endDate.setValue(null);
      } else {
        endDate.setValue(date);
      }
    }
    this.closeCalendar();
  }

  /**
   * Chiude il calendario da codice e scarta la data non confermata (✕, back hardware o dopo
   * «Conferma»). Lo stato si azzera subito; il `didDismiss` che ne segue viene ignorato, così non
   * annulla un campo riaperto mentre il foglio scende.
   */
  closeCalendar(): void {
    if (this.editing !== null) this._dismissExpected = true;
    this.editing = null;
    this.pendingDate = null;
    this._cdr.markForCheck();
  }

  /**
   * `didDismiss` del foglio: dopo una chiusura da codice non tocca lo stato (potrebbe essere stato
   * riaperto un campo); dopo una chiusura dell'utente (trascinamento, sfondo) azzera lo stato.
   */
  onCalendarDismissed(): void {
    if (this._dismissExpected) {
      this._dismissExpected = false;
      return;
    }
    this.editing = null;
    this.pendingDate = null;
    this._cdr.markForCheck();
  }

  /**
   * Chiude il calendario se è aperto (back hardware della modale host, oc:8761).
   *
   * @returns `true` se il calendario era aperto e l'ha chiuso.
   */
  closeOverlay(): Promise<boolean> {
    if (this.editing === null) return Promise.resolve(false);
    this.closeCalendar();
    return Promise.resolve(true);
  }

  /**
   * Testo del bottone di un campo data: la data nella lingua dell'app o «Seleziona la data».
   *
   * @param value Data `AAAA-MM-GG` del campo, `null` se vuoto.
   * @returns Il testo da mostrare.
   */
  dateLabel(value: string | null): string {
    return value
      ? formatDateForLang(value, this._langSvc.currentLang)
      : this._langSvc.instant('Seleziona la data');
  }

  /** Invia la richiesta; in caso di errore mostra un messaggio e conserva le foto. */
  async submit(): Promise<void> {
    if (this.submitting) return;
    this.triedSubmit = true;
    if (!this.canSubmit) {
      this._cdr.markForCheck();
      return;
    }
    this.submitting = true;
    this._cdr.markForCheck();
    try {
      const photos = await Promise.all(this.photos.map(p => this._toBlob(p)));
      const serialNumber = this.form.controls.serialNumber.value?.trim();
      await firstValueFrom(
        this._passportSvc.submitCertification({
          layerId: this.layerId,
          photos,
          ...(serialNumber ? {serialNumber} : {}),
          disclaimerAccepted: true,
          // canSubmit garantisce entrambe le date (datesValid).
          startDate: this.form.controls.startDate.value as string,
          endDate: this.form.controls.endDate.value as string,
        }),
      );
      this.photos = [];
      await this._toast('Richiesta inviata');
      await this.host.backToDetail();
    } catch (err) {
      await this._toast(
        this._isDateRejection(err)
          ? 'Controlla le date di percorrenza e riprova'
          : 'Invio non riuscito, riprova',
      );
    } finally {
      this.submitting = false;
      this._cdr.markForCheck();
    }
  }

  /**
   * Con foto non inviate o date scelte chiede conferma prima di uscire.
   *
   * @returns `true` se si può uscire.
   */
  async canLeave(): Promise<boolean> {
    const hasPhotos = this.photos.length > 0;
    const hasDates = !!this.form.controls.startDate.value || !!this.form.controls.endDate.value;
    if (!hasPhotos && !hasDates) return true;
    if (this.submitting) return false;
    const alert = await this._alertCtrl.create({
      message: this._langSvc.instant(
        hasPhotos
          ? 'Hai foto non inviate. Vuoi uscire e perderle?'
          : 'Hai dati non inviati. Vuoi uscire e perderli?',
      ),
      buttons: [
        {text: this._langSvc.instant('Annulla'), role: 'cancel'},
        {text: this._langSvc.instant('Esci'), role: 'confirm'},
      ],
    });
    await alert.present();
    const {role} = await alert.onDidDismiss();
    return role === 'confirm';
  }

  /** Si toglie da guard dell'host. */
  ngOnDestroy(): void {
    this.host?.registerGuard(null);
    this._subs.unsubscribe();
  }

  /**
   * Indica se il backend ha rifiutato l'invio per le date.
   *
   * @param err Errore dell'invio.
   * @returns `true` se è un 422 con errori su `start_date` o `end_date`.
   */
  private _isDateRejection(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 422) return false;
    const errors = err.error?.errors;
    return typeof errors === 'object' && errors !== null && ('start_date' in errors || 'end_date' in errors);
  }

  /**
   * Converte una foto del picker in Blob per il multipart.
   *
   * @param photo Foto Capacitor con `webPath`.
   * @returns Il contenuto della foto.
   */
  private async _toBlob(photo: Photo): Promise<Blob> {
    const res = await fetch(photo.webPath);
    return res.blob();
  }

  /**
   * Mostra un toast con il testo tradotto.
   *
   * @param key Chiave i18n del messaggio.
   */
  private async _toast(key: string): Promise<void> {
    const toast = await this._toastCtrl.create({message: this._langSvc.instant(key), duration: 2500});
    await toast.present();
  }
}
