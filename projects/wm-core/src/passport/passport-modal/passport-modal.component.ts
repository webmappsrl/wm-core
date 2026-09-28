import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {AlertController, IonNav, ModalController, Platform} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {WmPassportDetailComponent} from '../passport-detail/passport-detail.component';
import {PassportLeaveGuard} from '../passport-leave-guard';
import {WmPassportFormComponent} from '../passport-form/passport-form.component';

/**
 * Modale a tutto schermo del passaporto (oc:8166): `ion-nav` con il dettaglio come radice e il
 * form spinto sopra. Il back hardware di Android dal form torna al dettaglio invece di chiudere
 * la modale, e ogni uscita passa dal `canLeave()` del guard registrato.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-modal',
  templateUrl: './passport-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportModalComponent implements AfterViewInit, OnDestroy {
  /** Priorità sopra quella con cui Ionic chiude gli overlay (100). */
  static readonly BACK_PRIORITY = 101;

  @Input() layerId: number;
  @Input() layerTitle: string;
  @Input() layerLogo: string;
  @Input() layerImage: string;
  @ViewChild(IonNav) nav: IonNav;

  private _backSub: Subscription;
  private _guard: PassportLeaveGuard | null = null;
  /** Vero mentre il form viene spinto: protegge dal doppio tap sulla CTA. */
  private _openingForm = false;

  constructor(
    private _modalCtrl: ModalController,
    private _platform: Platform,
    private _alertCtrl: AlertController,
  ) {}

  /** Parametri passati al dettaglio radice. */
  get rootParams(): Pick<WmPassportModalComponent, 'layerId' | 'layerTitle' | 'layerLogo' | 'layerImage'> & {
    host: WmPassportModalComponent;
  } {
    return {
      layerId: this.layerId,
      layerTitle: this.layerTitle,
      layerLogo: this.layerLogo,
      layerImage: this.layerImage,
      host: this,
    };
  }

  /**
   * Imposta la radice dell'`ion-nav` e registra il gestore del back hardware.
   *
   * La radice si imposta qui, con i parametri nella stessa chiamata, e non con i binding
   * `[root]`/`[rootParams]`: `ion-nav` ha un watcher su `root` che chiama `setRoot(root,
   * rootParams)` appena `root` cambia, e se l'elemento è già idratato quando Angular assegna
   * `root` (prima di `rootParams`, nell'ordine del template) il dettaglio nasce senza layer, senza
   * titolo e senza host — «0 di 0 tappe» e una freccia che non chiude. Succede a volte, a seconda
   * dei tempi di idratazione (oc:8166).
   */
  ngAfterViewInit(): void {
    this.nav.setRoot(WmPassportDetailComponent, this.rootParams);
    this._backSub = this._platform.backButton.subscribeWithPriority(
      WmPassportModalComponent.BACK_PRIORITY,
      () => this.back(),
    );
  }

  /**
   * Apre il form di richiesta sopra il dettaglio. Un doppio tap sulla CTA, o un tap con il form
   * già aperto, non spinge un secondo form: quando il secondo veniva tolto, il suo `ngOnDestroy`
   * rimuoveva il guard e il primo restava senza conferma d'uscita.
   */
  async openForm(): Promise<void> {
    if (this._openingForm || this._guard) return;
    this._openingForm = true;
    try {
      await this.nav.push(WmPassportFormComponent, {layerId: this.layerId, host: this});
    } finally {
      this._openingForm = false;
    }
  }

  /**
   * Indietro: se è aperto un alert chiude solo quello, altrimenti dal form torna al dettaglio e
   * dal dettaglio chiude la modale. L'alert va gestito qui perché questo handler ha priorità 101
   * e Ionic esegue solo quello con priorità più alta: quello dell'alert (100) non partirebbe.
   */
  async back(): Promise<void> {
    const alert = await this._alertCtrl.getTop();
    if (alert) {
      await alert.dismiss();
      return;
    }
    if (!(await this._activeCanLeave())) return;
    if (await this.nav.canGoBack()) {
      await this.nav.pop();
    } else {
      await this._modalCtrl.dismiss();
    }
  }

  /** Chiude la modale, rispettando il `canLeave()` del guard registrato. */
  async close(): Promise<void> {
    if (await this._activeCanLeave()) await this._modalCtrl.dismiss();
  }

  /** Torna al dettaglio senza chiedere conferma, dopo un invio riuscito. */
  async backToDetail(): Promise<void> {
    await this.nav.popToRoot();
  }

  /**
   * Il form si registra qui per poter bloccare l'uscita.
   *
   * @param guard Componente che decide se si può uscire, o `null` per rimuoverlo.
   */
  registerGuard(guard: PassportLeaveGuard | null): void {
    this._guard = guard;
  }

  /** Rimuove il gestore del back hardware. */
  ngOnDestroy(): void {
    this._backSub?.unsubscribe();
  }

  /**
   * Chiede al guard registrato (il form, se aperto) se si può uscire.
   *
   * @returns `true` se si può uscire.
   */
  private async _activeCanLeave(): Promise<boolean> {
    return this._guard ? this._guard.canLeave() : true;
  }
}
