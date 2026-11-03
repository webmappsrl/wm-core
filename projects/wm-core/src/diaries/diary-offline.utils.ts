import {HttpErrorResponse} from '@angular/common/http';
import {ToastController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';

/** Messaggio dei tocchi che servono la rete (crea, modifica, elimina) fatti offline (oc:8169). */
export const DIARY_OFFLINE_ACTION_MESSAGE = 'Serve la connessione per questa azione.';

/**
 * Avvisa che l'azione richiede la connessione, al posto di aprire il form o cancellare.
 *
 * @param toastCtrl Controller dei toast.
 * @param langSvc Traduzioni.
 */
export async function presentDiaryOfflineToast(
  toastCtrl: ToastController,
  langSvc: LangService,
): Promise<void> {
  const toast = await toastCtrl.create({
    message: langSvc.instant(DIARY_OFFLINE_ACTION_MESSAGE),
    duration: 2500,
  });
  await toast.present();
}

/**
 * Chiave del messaggio per un invio rifiutato dal server, secondo il campo che il backend segnala:
 * usata dal form e dalla coda offline (oc:8169).
 *
 * @param err Errore dell'invio.
 * @returns chiave i18n del messaggio
 */
export function diaryHttpErrorKey(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 422) {
    // Il testo del backend è sempre in italiano: la chiave qui si traduce nella lingua dell'app.
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
