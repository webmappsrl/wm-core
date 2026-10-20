import {ToastController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';

/** Messaggio dei tocchi che servono la rete (crea, modifica, elimina) fatti offline (oc:8169). */
export const EXPERIENCE_OFFLINE_ACTION_MESSAGE = 'Serve la connessione per questa azione.';

/**
 * Avvisa che l'azione richiede la connessione, al posto di aprire il form o cancellare.
 *
 * @param toastCtrl Controller dei toast.
 * @param langSvc Traduzioni.
 */
export async function presentExperienceOfflineToast(
  toastCtrl: ToastController,
  langSvc: LangService,
): Promise<void> {
  const toast = await toastCtrl.create({
    message: langSvc.instant(EXPERIENCE_OFFLINE_ACTION_MESSAGE),
    duration: 2500,
  });
  await toast.present();
}
