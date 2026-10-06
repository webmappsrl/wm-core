import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  ViewEncapsulation,
} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {PassportStage} from '@wm-types/passport';
import {WmPosthogClient, WmShareMethod} from '@wm-types/posthog';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {
  openInNewTab,
  WmPreparedNativeShare,
  WmPreparedShare,
  WmShareImageFetchError,
  WmShareImageResponse,
  WmShareImageService,
  WmShareTexts,
  WmWebDownloadOutcome,
} from '@wm-core/services/share-image.service';
import {PassportService} from '../passport.service';
import {stageShareFileName} from '../passport.utils';

/** Operazioni della modale host usate dall'anteprima. */
export interface PassportSharePreviewHost {
  back(): Promise<void>;
}

/**
 * Stato dell'anteprima: `loading` mentre il backend genera l'immagine (e, sul web, mentre la si
 * scarica), `ready` con l'immagine e i pulsanti, `error` con il messaggio e «Riprova».
 */
export type PassportSharePreviewState = 'loading' | 'ready' | 'error';

/**
 * Come si condivide l'immagine pronta: `native` con il foglio di sistema, `web` con il file in
 * memoria («Condividi» se il browser lo sa fare, sempre «Scarica»), `link` sul web quando il file
 * non si è potuto scaricare (CORS) e resta solo «Apri immagine».
 */
export type PassportSharePreviewMode = 'native' | 'web' | 'link';

/** Messaggio per una tappa che il backend non riconosce più come percorsa (403/404). */
const STAGE_NOT_DONE_MESSAGE = 'Questa tappa non risulta più percorsa';
/** Messaggio per ogni altro fallimento della generazione dell'immagine. */
const SHARE_FAILED_MESSAGE = "Non è stato possibile creare l'immagine della tappa";

/**
 * Anteprima della condivisione di una tappa percorsa (oc:8702): spinta nell'`ion-nav` della modale
 * del passaporto dal pulsante «Condividi» della pagina della tappa. All'apertura chiede al backend
 * l'immagine, la mostra e offre i pulsanti per condividerla.
 *
 * L'immagine si prepara prima del tocco perché sul web `navigator.share()` vale solo dentro il
 * gestore di un gesto dell'utente, e la generazione può durare più a lungo: al tocco il file è già
 * in memoria e la condivisione parte senza attese.
 * - Nativo: l'immagine si mostra da `image_url` e intanto si scarica nella cache; «Condividi»
 *   mostra uno spinner finché il file non è pronto, poi apre il foglio di sistema, che comprende
 *   anche il salvataggio. Se il download nella cache fallisce l'immagine resta visibile, sotto
 *   compaiono il messaggio e «Riprova», che ripete solo il download.
 * - Web: si scarica l'immagine come Blob e la si mostra da un object URL; «Condividi» c'è solo se
 *   il browser sa condividere file, «Scarica» sempre.
 * - Web senza Blob (CORS): l'immagine si mostra da `image_url` e resta solo «Apri immagine».
 *
 * Ogni condivisione completata invia a PostHog `contentShared` con `content_type`
 * `passport-stage` e `share_method`; l'annullamento e l'apertura dell'anteprima non inviano nulla.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-share-preview',
  templateUrl: './passport-share-preview.component.html',
  styleUrls: ['./passport-share-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportSharePreviewComponent implements OnInit, OnDestroy {
  @Input() stage: PassportStage;
  /** Layer (cammino) della tappa, per l'endpoint dell'immagine. */
  @Input() layerId: number;
  /** Nome del cammino, per il titolo della condivisione. */
  @Input() layerTitle: string;
  /** Modale host, per tornare alla pagina della tappa. */
  @Input() host: PassportSharePreviewHost;

  state: PassportSharePreviewState = 'loading';
  mode: PassportSharePreviewMode | null = null;
  /** Sorgente dell'`<img>`: `image_url`, o l'object URL del Blob sul web. */
  imageSrc: string | null = null;
  /** Chiave italiana del messaggio d'errore, `null` se non c'è. */
  errorMessage: string | null = null;
  /** Web: il browser sa condividere il file preparato. */
  canShare = false;
  /**
   * Nativo: chiave italiana del messaggio quando il download nella cache è fallito; l'immagine
   * resta visibile e «Riprova» ripete solo il download. `null` se non c'è errore.
   */
  cacheErrorMessage: string | null = null;

  /** Nativo: il file nella cache, `null` finché il download non è finito. */
  private _native: WmPreparedNativeShare | null = null;
  /** Web: il file in memoria. */
  private _web: WmPreparedShare | null = null;
  /** Web, caso CORS: l'`image_url` da aprire in una nuova scheda. */
  private _linkUrl: string | null = null;
  /** Object URL dell'immagine mostrata, da revocare. */
  private _objectUrl: string | null = null;
  /** Numero del tentativo in corso: le risposte di un tentativo superato si ignorano. */
  private _attempt = 0;
  /** Nativo: vero mentre il foglio di condivisione è aperto, blocca il doppio tocco. */
  private _sharing = false;
  /** Nativo: la risposta del backend, per ripetere solo il download nella cache. */
  private _nativeResponse: WmShareImageResponse | null = null;

  constructor(
    private _langSvc: LangService,
    private _passportSvc: PassportService,
    private _shareImageSvc: WmShareImageService,
    private _cdr: ChangeDetectorRef,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {}

  /** «Condividi» compare sul nativo e, sul web, solo se il browser sa condividere file. */
  get showShare(): boolean {
    return this.mode === 'native' || (this.mode === 'web' && this.canShare);
  }

  /** Sul nativo «Condividi» resta disattivato finché il file non è nella cache. */
  get shareDisabled(): boolean {
    return this.mode === 'native' && (!this._native || this._sharing);
  }

  /** Nativo: il download nella cache è in corso, «Condividi» mostra lo spinner. */
  get sharePreparing(): boolean {
    return this.mode === 'native' && !this._native && !this.cacheErrorMessage;
  }

  /** Testo alternativo dell'immagine: lo stesso titolo della condivisione. */
  get imageAlt(): string {
    return this._texts().title;
  }

  /** All'apertura chiede l'immagine al backend. */
  ngOnInit(): void {
    void this._load();
  }

  /** Ignora le risposte ancora in volo e revoca l'object URL dell'immagine. */
  ngOnDestroy(): void {
    this._attempt++;
    this._revokeObjectUrl();
  }

  /** Tocco su «Riprova»: ripete la richiesta dell'immagine. */
  retry(): void {
    void this._load();
  }

  /**
   * Nativo, tocco su «Riprova» sotto l'immagine: ripete solo il download nella cache, senza
   * richiedere di nuovo l'immagine al backend.
   */
  retryCache(): void {
    if (this.mode !== 'native' || !this._nativeResponse) return;
    this.cacheErrorMessage = null;
    this._cdr.markForCheck();
    void this._downloadNative(this._nativeResponse, this._attempt);
  }

  /**
   * Tocco su «Condividi». Sul web `shareWeb()` chiama `navigator.share()` subito, senza `await`
   * prima, finché il gesto dell'utente vale. L'annullamento lascia l'anteprima com'è; ogni altro
   * errore del browser è già coperto dal download nel servizio.
   */
  share(): void {
    if (this.mode === 'native') {
      void this._shareNative();
      return;
    }
    if (this.mode === 'web' && this._web) {
      this._shareImageSvc.shareWeb(this._web, this._texts()).then(
        outcome =>
          this._trackShared(outcome === 'shared' ? 'web-share' : this._fallbackMethod(outcome)),
        () => {
          // AbortError: l'utente ha annullato, si resta sull'anteprima in silenzio
        },
      );
    }
  }

  /** Tocco su «Scarica»: scarica il file già in memoria. */
  download(): void {
    if (this._web) {
      this._trackShared(this._fallbackMethod(this._shareImageSvc.downloadWeb(this._web)));
    }
  }

  /** Tocco su «Apri immagine» (caso CORS): sincrono, così il browser non blocca la nuova scheda. */
  openImage(): void {
    if (this._linkUrl) {
      openInNewTab(this._linkUrl);
      this._trackShared('open-image');
    }
  }

  /**
   * Chiede l'immagine al backend e prepara il file per la condivisione. Ogni chiamata apre un
   * nuovo tentativo: le risposte di quello precedente, o arrivate dopo la chiusura, si ignorano.
   */
  private async _load(): Promise<void> {
    const attempt = ++this._attempt;
    this._reset();
    let response: WmShareImageResponse;
    try {
      response = await firstValueFrom(
        this._passportSvc.requestStageShareImage(this.layerId, this.stage.trackId),
      );
    } catch (error) {
      if (attempt === this._attempt) this._fail(error);
      return;
    }
    if (attempt !== this._attempt) return;
    if (this._shareImageSvc.isNative()) {
      await this._prepareNative(response, attempt);
    } else {
      await this._prepareWeb(response, attempt);
    }
  }

  /**
   * Nativo: mostra subito l'immagine da `image_url` e la scarica nella cache in background.
   *
   * @param response La risposta del backend.
   * @param attempt Il tentativo a cui appartiene.
   */
  private async _prepareNative(response: WmShareImageResponse, attempt: number): Promise<void> {
    this.mode = 'native';
    this._nativeResponse = response;
    this.imageSrc = response.image_url;
    this._setState('ready');
    await this._downloadNative(response, attempt);
  }

  /**
   * Nativo: scarica l'immagine nella cache. Se fallisce l'immagine resta visibile e sotto compare
   * il messaggio generico con «Riprova» (`retryCache()`).
   *
   * @param response La risposta del backend.
   * @param attempt Il tentativo a cui appartiene.
   */
  private async _downloadNative(response: WmShareImageResponse, attempt: number): Promise<void> {
    try {
      const prepared = await this._shareImageSvc.prepareNative(response, this._fileName());
      if (attempt !== this._attempt) return;
      this._native = prepared;
    } catch {
      if (attempt !== this._attempt) return;
      this.cacheErrorMessage = SHARE_FAILED_MESSAGE;
    }
    this._cdr.markForCheck();
  }

  /**
   * Web: scarica l'immagine come Blob e la mostra da un object URL. Se il Blob non si può scaricare
   * (CORS) mostra l'immagine da `image_url` e lascia solo «Apri immagine».
   *
   * @param response La risposta del backend.
   * @param attempt Il tentativo a cui appartiene.
   */
  private async _prepareWeb(response: WmShareImageResponse, attempt: number): Promise<void> {
    let prepared: WmPreparedShare;
    try {
      prepared = await this._shareImageSvc.prepareWeb(response, this._fileName());
    } catch (error) {
      if (attempt !== this._attempt) return;
      if (error instanceof WmShareImageFetchError) {
        this.mode = 'link';
        this._linkUrl = error.imageUrl;
        this.imageSrc = error.imageUrl;
        this._setState('ready');
      } else {
        this._fail(error);
      }
      return;
    }
    if (attempt !== this._attempt) return;
    this.mode = 'web';
    this._web = prepared;
    this.canShare = this._shareImageSvc.canShareFiles(prepared);
    this.imageSrc = this._createObjectUrl(prepared.file) ?? response.image_url;
    this._setState('ready');
  }

  /**
   * Nativo: apre il foglio di sistema. L'annullamento («Share canceled») lascia l'anteprima com'è;
   * ogni altro errore mostra il messaggio generico con «Riprova».
   */
  private async _shareNative(): Promise<void> {
    if (!this._native || this._sharing) return;
    this._sharing = true;
    this._cdr.markForCheck();
    try {
      await this._shareImageSvc.shareNativePrepared(this._native, this._texts());
      this._trackShared('native-share');
    } catch (error) {
      const message = (error as {message?: string} | null)?.message ?? '';
      if (!/cancel/i.test(message)) {
        this._fail(error);
      }
    } finally {
      this._sharing = false;
      this._cdr.markForCheck();
    }
  }

  /** Torna allo stato iniziale di un nuovo tentativo. */
  private _reset(): void {
    this._revokeObjectUrl();
    this._native = null;
    this._nativeResponse = null;
    this.cacheErrorMessage = null;
    this._web = null;
    this._linkUrl = null;
    this.mode = null;
    this.imageSrc = null;
    this.errorMessage = null;
    this.canShare = false;
    this._setState('loading');
  }

  /**
   * Crea l'object URL del file da mostrare.
   *
   * @param file Il file in memoria.
   * @returns L'object URL, o `null` se il browser non lo consente.
   */
  private _createObjectUrl(file: File): string | null {
    try {
      this._objectUrl = URL.createObjectURL(file);
      return this._objectUrl;
    } catch {
      return null;
    }
  }

  /** Revoca l'object URL dell'immagine, se c'è. */
  private _revokeObjectUrl(): void {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = null;
    }
  }

  /**
   * Invia a PostHog `contentShared` per una condivisione completata della tappa.
   *
   * @param method Come si è completata la condivisione.
   */
  private _trackShared(method: WmShareMethod): void {
    try {
      const result = this._posthogClient?.capture('contentShared', {
        content_type: 'passport-stage',
        content_id: String(this.stage.trackId),
        layer_id: String(this.layerId),
        share_method: method,
      });
      // il tracciamento non deve mai lasciare promise rifiutate né interrompere la condivisione
      void Promise.resolve(result).catch(() => {});
    } catch {
      // un client che lancia in modo sincrono non deve interrompere la condivisione
    }
  }

  /**
   * Traduce l'esito del download web nel `share_method` da tracciare.
   *
   * @param outcome L'esito di `downloadWeb()` (anche come ripiego di `shareWeb()`).
   * @returns `open-image` se si è aperto `share_url` in una nuova scheda, altrimenti `download`.
   */
  private _fallbackMethod(outcome: WmWebDownloadOutcome): WmShareMethod {
    return outcome === 'opened' ? 'open-image' : 'download';
  }

  /** Testi della condivisione, già tradotti. */
  private _texts(): WmShareTexts {
    return {
      title: this._langSvc.instant('Ho percorso una tappa di {{cammino}}', {
        cammino: this.layerTitle ?? '',
      }),
      dialogTitle: this._langSvc.instant('Condividi con i tuoi amici'),
    };
  }

  /** Nome del file dell'immagine condivisa: `<cammino>-<tappa>.png`. */
  private _fileName(): string {
    return stageShareFileName(this.layerTitle, this.stage, this._langSvc.currentLang);
  }

  /**
   * Mostra il messaggio d'errore adatto: 403 e 404 vogliono dire che la tappa non risulta più
   * percorsa, ogni altro errore è un fallimento generico della generazione.
   *
   * @param error L'errore ricevuto.
   */
  private _fail(error: unknown): void {
    const status = (error as {status?: number} | null)?.status;
    this.errorMessage =
      status === 403 || status === 404 ? STAGE_NOT_DONE_MESSAGE : SHARE_FAILED_MESSAGE;
    this._setState('error');
  }

  /**
   * Aggiorna lo stato e segna la vista da aggiornare (`OnPush`).
   *
   * @param state Nuovo stato.
   */
  private _setState(state: PassportSharePreviewState): void {
    this.state = state;
    this._cdr.markForCheck();
  }
}
