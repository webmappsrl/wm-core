import {Injectable} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {PassportService} from '../passport.service';
import {WmPassportModalComponent} from './passport-modal.component';

/** Dati del cammino passati alla modale del dettaglio. */
export interface PassportModalParams {
  layerId: number;
  layerTitle: string;
  /** Logo al centro dell'anello del dettaglio. */
  layerLogo?: string;
  /** Immagine sbiadita di sfondo del dettaglio. */
  layerImage?: string;
}

/**
 * Apertura della modale a tutto schermo del dettaglio del cammino (oc:8703), in un punto solo
 * per il badge della home del layer e per il passaporto a timbri. Senza `breakpoints` non c'è lo
 * swipe verso il basso, e `backdropDismiss: false` evita che nella webapp backdrop ed Escape
 * saltino il guard del form: le uscite passano tutte dalla modale.
 */
@Injectable({providedIn: 'root'})
export class PassportModalService {
  /** Vero dalla richiesta di apertura alla chiusura: un doppio tocco non apre due modali. */
  private _open = false;

  constructor(private _modalCtrl: ModalController, private _passportSvc: PassportService) {}

  /**
   * Apre il dettaglio del cammino. Alla chiusura rilegge il progresso del layer, perché nel
   * dettaglio può essere cambiato (approvazione, ritorno in primo piano) e chi l'ha aperto deve
   * riallinearsi (oc:8676).
   *
   * @param params Cammino da mostrare.
   * @param options `refresh: true` rilegge il progresso prima di mostrare il dettaglio: serve
   *   quando chi apre non lo stava già leggendo, e il dato condiviso potrebbe essere vecchio.
   */
  async open(params: PassportModalParams, options: {refresh?: boolean} = {}): Promise<void> {
    if (this._open) return;
    this._open = true;
    try {
      const modal = await this._modalCtrl.create({
        component: WmPassportModalComponent,
        componentProps: params,
        backdropDismiss: false,
      });
      if (options.refresh) this._passportSvc.reloadProgress(params.layerId);
      await modal.present();
      modal.onDidDismiss().then(() => {
        this._open = false;
        this._passportSvc.refreshProgress(params.layerId);
      });
    } catch (error) {
      this._open = false;
      throw error;
    }
  }
}
