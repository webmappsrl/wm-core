import {Injectable} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {Directory, Filesystem} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {firstValueFrom, Observable} from 'rxjs';

/**
 * Ritardo prima di revocare l'object URL di un download: una revoca immediata può interrompere il
 * download in alcuni browser.
 */
export const OBJECT_URL_REVOKE_DELAY_MS = 1000;

/**
 * Apre un indirizzo in una nuova scheda, senza dare alla pagina aperta accesso a `window.opener`.
 * Va chiamata in modo sincrono dal gestore del click, perché il browser non blocchi il popup.
 *
 * @param url L'indirizzo da aprire.
 */
export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener');
}

/**
 * Esito del download sul web (`downloadWeb()`): `downloaded` se il file è stato scaricato,
 * `opened` se, non potendo creare l'object URL, si è aperto `share_url` in una nuova scheda.
 */
export type WmWebDownloadOutcome = 'downloaded' | 'opened';

/** Testi del foglio di condivisione, già tradotti da chi chiama. */
export interface WmShareTexts {
  title: string;
  dialogTitle: string;
  text?: string;
}

/** Esito della preparazione sul web: il file è pronto da condividere. */
export interface WmPreparedShare {
  file: File;
  shareUrl: string;
}

/**
 * Esito della preparazione sul nativo (`prepareNative()`): l'immagine è già nella cache del
 * dispositivo e si può condividere con `shareNativePrepared()` senza altre attese.
 */
export interface WmPreparedNativeShare {
  /** URI del file nella cache, da passare a `Share.share({files})`. */
  fileUri: string;
  /** L'`image_url` scaricato, utile per mostrare l'anteprima. */
  imageUrl: string;
  /** Lo `share_url` da allegare alla condivisione. */
  shareUrl: string;
}

/** Risposta del backend che ha generato l'immagine da condividere. */
export interface WmShareImageResponse {
  image_url: string;
  share_url: string;
}

/**
 * Errore lanciato da `prepareWeb()` quando l'immagine non si riesce a scaricare come Blob (CORS,
 * rete, risposta non `ok`). Porta con sé `imageUrl` e `shareUrl`, così chi chiama può ripiegare,
 * ad esempio mostrando l'immagine da `imageUrl` e aprendola in una nuova scheda.
 */
export class WmShareImageFetchError extends Error {
  /**
   * @param imageUrl L'`image_url` che non si è riusciti a scaricare.
   * @param shareUrl Lo `share_url` restituito dal backend.
   * @param originalError L'errore originale, se c'è.
   */
  constructor(
    public readonly imageUrl: string,
    public readonly shareUrl: string,
    public readonly originalError?: unknown,
  ) {
    super(`Impossibile scaricare l'immagine da condividere: ${imageUrl}`);
    this.name = 'WmShareImageFetchError';
  }
}

/**
 * Condivisione di un'immagine generata dal backend (oc:8702), comune a più chiamanti: la storia
 * di una traccia UGC nell'app e la tappa percorsa del passaporto.
 *
 * Il servizio non ha guardie «in corso» né messaggi d'errore per l'utente: lancia e lascia
 * entrambe le cose ai chiamanti. La richiesta al backend resta del chiamante, perché endpoint,
 * corpo e mappatura degli errori HTTP sono suoi.
 *
 * Due modi d'uso:
 * - in un solo passo, `shareNative()`: richiesta, download e foglio di condivisione (storia UGC);
 * - in due passi, per un'anteprima (passaporto): il chiamante esegue la richiesta, prepara il file
 *   (`prepareNative()` o `prepareWeb()`) mentre mostra l'immagine, e condivide al tocco
 *   (`shareNativePrepared()` o `shareWeb()`/`downloadWeb()`).
 */
@Injectable({
  providedIn: 'root',
})
export class WmShareImageService {
  /**
   * Indica se l'app gira su piattaforma nativa, per scegliere fra il percorso nativo
   * (`shareNative()`, `prepareNative()` + `shareNativePrepared()`) e quello web (`prepareWeb()` +
   * `shareWeb()`/`downloadWeb()`).
   *
   * @returns `true` su iOS/Android (`Capacitor.isNativePlatform()`).
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Condivisione nativa in un solo passo, scorciatoia costruita su `prepareNative()` +
   * `shareNativePrepared()`: esegue la richiesta, scarica `image_url` nella cache e apre il foglio
   * di condivisione con il file, `share_url` e i testi. La usa chi non mostra un'anteprima (la
   * storia di una traccia UGC); chi la mostra chiama i due passi separatamente.
   *
   * @param request La richiesta al backend che restituisce `image_url` e `share_url`.
   * @param texts I testi del foglio di condivisione, già tradotti.
   * @param fileName Il nome del file nella cache.
   * @returns Risolve a condivisione completata; lancia qualunque errore della richiesta, del
   * download o di `Share.share()` (compreso l'annullamento da parte dell'utente).
   */
  async shareNative(
    request: Observable<WmShareImageResponse>,
    texts: WmShareTexts,
    fileName: string,
  ): Promise<void> {
    const response = await firstValueFrom(request);
    const prepared = await this.prepareNative(response, fileName);
    await this.shareNativePrepared(prepared, texts);
  }

  /**
   * Nativo, primo passo dell'anteprima: scarica `image_url` nella cache con
   * `Filesystem.downloadFile()` (download nativo, niente base64) e ne risolve l'URI con
   * `Filesystem.getUri()`.
   *
   * @param response La risposta del backend con `image_url` e `share_url`.
   * @param fileName Il nome del file nella cache.
   * @returns URI del file in cache, `image_url` e `share_url`.
   * @throws Qualunque errore del download o della risoluzione dell'URI.
   */
  async prepareNative(
    response: WmShareImageResponse,
    fileName: string,
  ): Promise<WmPreparedNativeShare> {
    const {image_url, share_url} = response;
    await Filesystem.downloadFile({
      url: image_url,
      path: fileName,
      directory: Directory.Cache,
    });
    const {uri} = await Filesystem.getUri({path: fileName, directory: Directory.Cache});
    return {fileUri: uri, imageUrl: image_url, shareUrl: share_url};
  }

  /**
   * Nativo, secondo passo dell'anteprima: apre il foglio di condivisione di sistema con il file
   * già in cache, `share_url` e i testi.
   *
   * @param prepared Il risultato di `prepareNative()`.
   * @param texts I testi del foglio di condivisione, già tradotti.
   * @throws Qualunque errore di `Share.share()`, compreso l'annullamento da parte dell'utente
   * («Share canceled»).
   */
  async shareNativePrepared(prepared: WmPreparedNativeShare, texts: WmShareTexts): Promise<void> {
    await Share.share({
      url: prepared.shareUrl,
      files: [prepared.fileUri],
      text: texts.text,
      title: texts.title,
      dialogTitle: texts.dialogTitle,
    });
  }

  /**
   * Web, primo passo dell'anteprima: scarica `image_url` come `File`, da tenere in memoria fino al
   * tocco. È separato da `shareWeb()` perché `navigator.share()` vale solo dentro il gestore di un
   * gesto dell'utente: il file deve essere già pronto quando arriva il tocco.
   *
   * @param response La risposta del backend con `image_url` e `share_url`.
   * @param fileName Il nome del `File` creato.
   * @returns Il file e lo `share_url`, pronti per `shareWeb()` o `downloadWeb()`.
   * @throws `WmShareImageFetchError` se l'immagine non si riesce a scaricare come Blob (CORS, rete,
   * risposta non `ok`): chi chiama può ripiegare sull'`image_url`.
   */
  async prepareWeb(response: WmShareImageResponse, fileName: string): Promise<WmPreparedShare> {
    const {image_url, share_url} = response;
    let blob: Blob;
    try {
      const res = await fetch(image_url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      blob = await res.blob();
    } catch (error) {
      throw new WmShareImageFetchError(image_url, share_url, error);
    }
    return {
      file: new File([blob], fileName, {type: blob.type || 'image/png'}),
      shareUrl: share_url,
    };
  }

  /**
   * Verifica, in modo sincrono, che il browser esponga la Web Share API e possa condividere quel
   * file: serve a decidere se mostrare «Condividi» accanto a «Scarica».
   *
   * @param prepared Il risultato di `prepareWeb()`.
   * @returns `true` se `navigator.share` e `navigator.canShare({files})` lo consentono.
   */
  canShareFiles(prepared: WmPreparedShare): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') {
      return false;
    }
    try {
      return navigator.canShare({files: [prepared.file]});
    } catch {
      return false;
    }
  }

  /**
   * Web: condivide il file preparato da `prepareWeb()`. `navigator.share()` parte in modo
   * sincrono, prima di qualunque `await`: chi chiama lo invoca direttamente dal gestore del click,
   * finché il gesto dell'utente vale. Se il browser non sa condividere il file, o la condivisione
   * fallisce per un motivo diverso dall'annullamento, scarica il file.
   *
   * Il download di ripiego, quando `navigator.share()` fallisce, parte dopo un `await`, quindi
   * fuori dal gesto dell'utente: i browser consentono comunque il download di un Blob con
   * `<a download>` su un object URL, che non è un popup.
   *
   * @param prepared Il risultato di `prepareWeb()`.
   * @param texts I testi della condivisione; `dialogTitle` sul web non si usa.
   * @returns `'shared'` se il foglio di condivisione si è chiuso con successo; altrimenti l'esito
   * del ripiego `downloadWeb()`: `'downloaded'`, o `'opened'` se si è aperto `share_url`.
   * @throws L'`AbortError` di `navigator.share()` quando l'utente annulla: non va coperto con un
   * download.
   */
  async shareWeb(
    prepared: WmPreparedShare,
    texts: WmShareTexts,
  ): Promise<'shared' | WmWebDownloadOutcome> {
    if (this.canShareFiles(prepared)) {
      try {
        await navigator.share({
          files: [prepared.file],
          url: prepared.shareUrl,
          title: texts.title,
          text: texts.text,
        });
        return 'shared';
      } catch (error) {
        if ((error as {name?: string} | null)?.name === 'AbortError') {
          throw error;
        }
      }
    }
    return this.downloadWeb(prepared);
  }

  /**
   * Web: scarica il file con un `<a download>` su un object URL; se non si può creare l'object
   * URL, apre `shareUrl` in una nuova scheda come ultima risorsa. È sincrono: va chiamato dal
   * gestore del click.
   *
   * @param prepared Il file e lo `share_url` da usare nel fallback.
   * @returns `'downloaded'` se il file è stato scaricato, `'opened'` se si è aperto `share_url`.
   */
  downloadWeb(prepared: WmPreparedShare): WmWebDownloadOutcome {
    let href: string;
    try {
      href = URL.createObjectURL(prepared.file);
    } catch {
      openInNewTab(prepared.shareUrl);
      return 'opened';
    }
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = prepared.file.name;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), OBJECT_URL_REVOKE_DELAY_MS);
    return 'downloaded';
  }
}
