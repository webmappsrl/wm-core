import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
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
  });
  photos: Photo[] = [];
  submitting = false;
  /** Gli errori di validazione compaiono solo dopo il primo tentativo d'invio. */
  triedSubmit = false;

  private _needsPrivacy = false;
  private _logged = false;
  private _subs = new Subscription();

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

  /** Invio possibile: foto valide, disclaimer accettato, utente loggato con consenso, nessun invio in corso. */
  get canSubmit(): boolean {
    return (
      this.photosValid &&
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
        }),
      );
      this.photos = [];
      await this._toast('passport.form.sent');
      await this.host.backToDetail();
    } catch {
      await this._toast('passport.form.error');
    } finally {
      this.submitting = false;
      this._cdr.markForCheck();
    }
  }

  /**
   * Con foto non inviate chiede conferma prima di uscire.
   *
   * @returns `true` se si può uscire.
   */
  async canLeave(): Promise<boolean> {
    if (this.photos.length === 0) return true;
    if (this.submitting) return false;
    const alert = await this._alertCtrl.create({
      message: this._langSvc.instant('passport.form.leave'),
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
