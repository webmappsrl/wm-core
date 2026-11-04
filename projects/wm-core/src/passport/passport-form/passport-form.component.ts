import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
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
import {isEndBeforeStart, todayLocal} from '../passport.utils';
import {WmDateRangePickerComponent} from '../../shared/date-range-picker/date-range-picker.component';
import {DateRange} from '../../shared/date-range-picker/date-range.utils';


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
  /** Data locale del dispositivo all'apertura del form, `AAAA-MM-GG`: limite massimo delle date. */
  readonly today = todayLocal();

  private _needsPrivacy = false;
  private _logged = false;
  private _subs = new Subscription();
  /** Calendario a intervallo (oc:8169, ciclo 4): il suo foglio si chiude col back hardware. */
  @ViewChild(WmDateRangePickerComponent) private _picker?: WmDateRangePickerComponent;

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
   * Periodo del cammino per il calendario a intervallo (oc:8169, ciclo 4).
   *
   * @returns L'intervallo, `null` se non c'è l'inizio.
   */
  get range(): DateRange | null {
    const {startDate, endDate} = this.form.controls;
    if (!startDate.value) return null;
    return {start: startDate.value, end: endDate.value ?? startDate.value};
  }

  /**
   * Intervallo confermato nel calendario: scrive le due date come prima, un giorno solo le rende uguali.
   *
   * @param range Intervallo, `null` se svuotato.
   */
  onRange(range: DateRange | null): void {
    this.form.controls.startDate.setValue(range?.start ?? null);
    this.form.controls.endDate.setValue(range?.end ?? null);
    this._cdr.markForCheck();
  }

  /**
   * Chiude il foglio del calendario se è aperto (back hardware della modale host, oc:8761).
   *
   * @returns `true` se il calendario era aperto e l'ha chiuso.
   */
  closeOverlay(): Promise<boolean> {
    if (!this._picker?.isOpen) return Promise.resolve(false);
    this._picker.cancel();
    return Promise.resolve(true);
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
