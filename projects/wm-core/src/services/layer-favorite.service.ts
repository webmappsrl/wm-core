import {HttpClient} from '@angular/common/http';
import {Inject, Injectable, Optional} from '@angular/core';
import {Store} from '@ngrx/store';
import {ToastController} from '@ionic/angular';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {ILAYER} from '@wm-core/types/config';
import {WmPosthogClient} from '@wm-types/posthog';
import {BehaviorSubject, Observable, lastValueFrom} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

/**
 * Servizio per la gestione dei layer (cammini) preferiti dell'utente, con cache
 * in-memory ottimistica: la lista viene fetchata una sola volta (`getFavorites()`)
 * e mantenuta in memoria, aggiornata otticamente ad ogni `toggle()` in base alla
 * risposta del backend, senza richiedere un nuovo round-trip di lettura.
 */
@Injectable({
  providedIn: 'root',
})
export class LayerFavoriteService {
  private _favorites$ = new BehaviorSubject<ILAYER[] | null>(null);
  private _pending = new Set<string>();
  private _fetchPromise: Promise<ILAYER[]> | null = null;
  /**
   * Traccia se almeno un fetch completo verso il backend è andato a buon fine.
   * Separato deliberatamente dal contenuto di `_favorites$`, perché `toggle()`
   * scrive in `_favorites$` in modo ottimistico anche se `getFavorites()` non è
   * mai stato chiamato — usare `_favorites$.value != null` come guardia di cache
   * tratterebbe erroneamente quell'aggiornamento parziale come "fetch completo".
   */
  private _loaded = false;
  /**
   * Contatore incrementato ad ogni scrittura in `_favorites$` che NON provenga da
   * un fetch completo (logout, toggle ottimistico). Un fetch di `getFavorites()`
   * in volo lo cattura all'avvio: se al resolve risulta cambiato, significa che un
   * toggle (o un logout) ha scritto una versione più recente della cache mentre il
   * fetch era in corso — in quel caso il risultato (potenzialmente superato) del
   * fetch viene scartato invece di sovrascrivere l'aggiornamento più recente.
   */
  private _version = 0;

  /**
   * @param _http HttpClient per le chiamate REST verso il backend layer/favorite.
   * @param _environmentSvc Fornisce l'origin del backend corrente.
   * @param _store Store NgRx, usato per osservare lo stato di autenticazione.
   * @param _toastCtrl Usato da `toggleWithFeedback()` per il toast di errore.
   * @param _langSvc Usato da `toggleWithFeedback()` per tradurre il messaggio del toast.
   * @param _posthogClient Opzionale — usato da `toggleWithFeedback()` per l'evento `layerFavorited`.
   */
  constructor(
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
    private _store: Store,
    private _toastCtrl: ToastController,
    private _langSvc: LangService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    this._store
      .select(isLogged)
      .pipe(distinctUntilChanged())
      .subscribe(logged => {
        if (!logged) {
          this._favorites$.next(null);
          this._loaded = false;
          this._fetchPromise = null;
          this._version++;
        } else {
          // Fire and forget: popola la cache sia all'avvio con utente già
          // loggato sia al login durante la sessione. Il chiamante non deve
          // attendere nulla: il servizio stesso aggiorna `_favorites$`/`_loaded`.
          void this.getFavorites();
        }
      });
  }

  /**
   * Emette la lista corrente (aggiornata otticamente ad ogni toggle) — usato da
   * webmapp-app per il tab "Cammini" reattivo. Richiede che `getFavorites()` sia stato
   * chiamato almeno una volta per popolare la cache iniziale.
   */
  get favorites$(): Observable<ILAYER[]> {
    return this._favorites$.pipe(map(favorites => favorites ?? []));
  }

  /**
   * Restituisce la lista dei layer preferiti, fetchandola dal backend solo la prima
   * volta (o dopo un logout, che invalida la cache); le chiamate successive
   * restituiscono il valore già in cache senza un nuovo round-trip. Chiamate
   * concorrenti prima che la prima richiesta sia completata condividono la stessa
   * richiesta HTTP in corso, invece di generarne una per ciascuna.
   *
   * @returns La lista dei layer preferiti correnti.
   */
  async getFavorites(): Promise<ILAYER[]> {
    if (this._loaded) {
      return this._favorites$.value ?? [];
    }

    if (this._fetchPromise == null) {
      // Riferimento stabile alla promise di questo specifico tentativo di fetch:
      // se nel frattempo un logout azzera `_fetchPromise` (o ne avvia uno nuovo),
      // il confronto sotto fa scartare silenziosamente il risultato tardivo
      // invece di scriverlo in cache.
      const versionAtStart = this._version;
      const fetchPromise: Promise<ILAYER[]> = lastValueFrom(
        this._http.get<{favorites: ILAYER[]}>(
          `${this._environmentSvc.origin}/api/layer/favorite/list`,
        ),
      )
        .then(res => {
          // Normalizza esplicitamente `id` a stringa: il backend (Eloquent, PHP)
          // serializza `id` come numero JSON nativo senza cast a stringa, mentre
          // `ILAYER.id` è tipizzato `string` — senza questa normalizzazione i
          // confronti `===` a valle (isFavorite$/toggle) fallirebbero silenziosamente
          // per ogni layer arrivato da questo endpoint.
          const favorites = (res.favorites ?? []).map(l => ({...l, id: String(l.id)}));
          // Se `_version` è cambiato da quando questo fetch è partito, un toggle (o
          // un logout) ha scritto in `_favorites$` una versione più recente nel
          // frattempo — questo risultato è ormai superato, va scartato senza
          // sovrascrivere l'aggiornamento più recente né segnare `_loaded`
          // (la prossima getFavorites() rifarà un fetch fresco).
          if (this._fetchPromise === fetchPromise && this._version === versionAtStart) {
            this._favorites$.next(favorites);
            this._loaded = true;
          }
          return favorites;
        })
        .finally(() => {
          if (this._fetchPromise === fetchPromise) {
            this._fetchPromise = null;
          }
        });
      this._fetchPromise = fetchPromise;
    }

    return this._fetchPromise;
  }

  /**
   * Osservabile reattivo che indica se un layer è tra i preferiti in cache.
   * Il confronto tra ID avviene forzando entrambi i lati a stringa con `String(...)`,
   * per essere robusto anche se in cache fosse finito un `id` non normalizzato
   * (es. numerico, come restituito nativamente da Eloquent/PHP).
   *
   * @param layerId ID del layer da verificare.
   * @returns Observable che emette `true` se il layer è tra i preferiti in cache.
   */
  isFavorite$(layerId: string): Observable<boolean> {
    return this._favorites$.pipe(
      map(favorites => !!favorites?.some(l => String(l.id) === String(layerId))),
    );
  }

  /**
   * Indica se un toggle è attualmente in corso per il layer indicato — utile per
   * disabilitare il controllo UI (es. cuoricino) durante la richiesta.
   *
   * @param layerId ID del layer da verificare.
   * @returns `true` se un toggle per quel layer è in corso.
   */
  isPending(layerId: string): boolean {
    return this._pending.has(layerId);
  }

  /**
   * Alterna lo stato di preferito di un layer sul backend e aggiorna otticamente la
   * cache in-memory in base all'esito. Chiamate concorrenti sullo stesso layer,
   * mentre una è già in corso, restituiscono lo stato corrente in cache senza
   * inviare una nuova richiesta.
   *
   * @param layer Layer da aggiungere/rimuovere dai preferiti.
   * @returns `true` se il layer risulta preferito dopo il toggle, `false` altrimenti.
   */
  async toggle(layer: ILAYER): Promise<boolean> {
    // `layerId` viene forzato a stringa qui: il confronto con la cache deve
    // restare robusto a prescindere dalla provenienza del `layer` passato dal
    // chiamante (non normalizziamo l'oggetto `layer` stesso, solo il confronto).
    const layerId = String(layer.id);
    if (this._pending.has(layerId)) {
      return this._favorites$.value?.some(l => String(l.id) === layerId) ?? false;
    }

    this._pending.add(layerId);
    try {
      const res = await lastValueFrom(
        this._http.post<{favorite: boolean}>(
          `${this._environmentSvc.origin}/api/layer/favorite/toggle/${layerId}`,
          null,
        ),
      );
      const current = this._favorites$.value ?? [];
      this._favorites$.next(
        res.favorite
          ? [...current.filter(l => String(l.id) !== layerId), layer]
          : current.filter(l => String(l.id) !== layerId),
      );
      this._version++;

      return res.favorite;
    } finally {
      this._pending.delete(layerId);
    }
  }

  /**
   * Alterna il preferito con il feedback utente completo (toast di errore, evento
   * PostHog `layerFavorited` sia su aggiunta che su rimozione, distinte dalla prop
   * `favorite`) — centralizza qui la logica altrimenti duplicata identica tra
   * `LayerBoxComponent` e `WmHomeLayerComponent`. Non fa nulla se un toggle per lo
   * stesso layer è già in corso (vedi `isPending()`). Il chiamante resta
   * responsabile solo dello stato locale (es. `isTogglingFavorite` per il binding
   * CSS), non della logica di business del toggle stesso.
   *
   * @param layer Layer da aggiungere/rimuovere dai preferiti.
   */
  async toggleWithFeedback(layer: ILAYER): Promise<void> {
    if (this.isPending(String(layer.id))) {
      return;
    }

    try {
      const favorite = await this.toggle(layer);
      if (this._posthogClient) {
        this._posthogClient.capture('layerFavorited', {
          layer_id: String(layer.id),
          favorite,
        });
      }
    } catch {
      const toast = await this._toastCtrl.create({
        message: this._langSvc.instant('Impossibile aggiornare i preferiti, riprova'),
        duration: 2000,
      });
      await toast.present();
    }
  }
}
