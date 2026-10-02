import {Injectable, Inject, Optional} from '@angular/core';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {
  currentEcImageGalleryIndex,
  currentEcLayerId,
  currentEcPoiId,
  currentEcRelatedPoiId,
  currentEcTrackId,
} from '@wm-core/store/features/ec/ec.actions';
import {currentUgcPoiId, currentUgcTrackId} from '@wm-core/store/features/ugc/ugc.actions';
import {Params} from '@angular/router';
import {debounceTime, skip, take} from 'rxjs/operators';
import {
  closeDownloads,
  closeUgc,
  inputTyped,
  openUgc,
  setMapDetailsStatus,
} from '@wm-core/store/user-activity/user-activity.action';
import {ILAYER} from '@wm-core/types/config';
import {BehaviorSubject} from 'rxjs';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {DeviceService} from './device.service';

@Injectable({
  providedIn: 'root',
})
export class UrlHandlerService {
  private _currentQueryParams$: BehaviorSubject<Params> = new BehaviorSubject<Params>({});
  private _emptyParams: Params = {
    track: undefined,
    poi: undefined,
    ugc_track: undefined,
    ugc_poi: undefined,
    slug: undefined,
    layer: undefined,
    filter: undefined,
    gallery_index: undefined,
  };
  /**
   * Gli ultimi parametri letti da `initialize()`. Diversi da `_currentQueryParams$`, che
   * `navigateTo()` aggiorna già prima che la navigazione avvenga (oc:8684).
   */
  private _lastReadParams: Params = {};
  /**
   * Copia del testo di ricerca tolto dall'URL all'apertura di una `track` o di un `poi`: la X
   * della track (`closeTrack()`) lo rimette nell'URL. Si cancella non appena nell'URL non c'è
   * più nessuna track (oc:8684).
   */
  private _savedSearch: string | null = null;

  private _ugcOpened$ = this._store.select(ugcOpened);

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _store: Store,
    private _deviceService: DeviceService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    this.initialize();
  }

  changeURL(route, queryParams: Params = this.getCurrentQueryParams()): void {
    if (route != null && route != this.getCurrentPath()) {
      setTimeout(() => {
        this.navigateTo([route], queryParams);
      }, 0);
    }
  }

  getCurrentPath(): string {
    return this._router.url.split('?')[0].replace('/', '');
  }

  /**
   * Get the current query params from the URL.
   * @returns Params - The query parameters as an object.
   */
  getCurrentQueryParams(): Params {
    return this._currentQueryParams$.value;
  }

  initialize(): void {
    this._route.queryParams.pipe(skip(1), debounceTime(100)).subscribe(params => {
      // Deve restare la PRIMA istruzione del blocco: alcuni dispatch sotto (es.
      // currentEcLayerId) possono innescare synchronously un effect NgRx che a sua
      // volta chiama getCurrentQueryParams() (es. HomePage -> changeURL()) — se questa
      // riga fosse dopo i dispatch, quel chiamante leggerebbe ancora i query param
      // precedenti (oc:8470).
      this._currentQueryParams$.next(params);

      // Un link o un ricaricamento che apre una `track`/`poi` con `search` si normalizza: `search`
      // esce dall'URL senza aggiungere un passo alla cronologia e resta come copia salvata. I
      // dispatch partono alla lettura successiva, quella senza `search`; `_lastReadParams` resta
      // quello di prima, e alla lettura successiva la condizione non vale più perché `search` non
      // c'è. Una `search` aggiunta con track/poi invariati (la search bar col popup di un POI
      // aperto) non si normalizza: è una ricerca digitata (oc:8684).
      if (this._opensTrackOrPoiWithSearch(params, this._lastReadParams)) {
        this._savedSearch = this._decodeQueryParam(params.search);
        this.navigateTo([], {...params, search: undefined}, {replaceUrl: true});
        return;
      }
      // Senza track nell'URL la copia salvata non ha più contesto, comunque la si sia chiusa.
      if (params.track == null) {
        this._savedSearch = null;
      }

      this._store.dispatch(currentEcLayerId({currentEcLayerId: params.layer ?? null}));
      this._store.dispatch(currentEcTrackId({currentEcTrackId: params.track ?? null}));
      this._store.dispatch(currentEcPoiId({currentEcPoiId: params.poi ?? null}));
      this._store.dispatch(
        currentEcRelatedPoiId({currentRelatedPoiId: params.ec_related_poi ?? null}),
      );
      this._store.dispatch(currentUgcTrackId({currentUgcTrackId: params.ugc_track ?? null}));
      this._store.dispatch(currentUgcPoiId({currentUgcPoiId: params.ugc_poi ?? null}));
      this._store.dispatch(
        currentEcImageGalleryIndex({
          currentEcImageGalleryIndex: params.gallery_index ? +params.gallery_index : null,
        }),
      );
      // Una ricerca che ricompare quando si chiude una track o un poi (X, indietro del browser) è
      // ripristinata, non digitata: PostHog non la conta. Se track/poi restano nell'URL, la
      // ricerca è digitata ora (oc:8684).
      const restored =
        params.search != null &&
        params.search !== this._lastReadParams.search &&
        params.track == null &&
        params.poi == null &&
        (this._lastReadParams.track != null || this._lastReadParams.poi != null);
      this._store.dispatch(
        inputTyped({inputTyped: this._decodeQueryParam(params.search), restored}),
      );
      this._checkIfUgcIsOpened(params);

      // Traccia gli eventi PostHog per i cambiamenti di URL sulla app mobile
      this._mobileTrackUrlChange(params);

      this._lastReadParams = params;
    });
  }

  navigateTo(
    routes: string[] = [],
    queryParams: Params = this._emptyParams,
    extras?: {replaceUrl?: boolean},
  ): void {
    this._currentQueryParams$.next(queryParams);
    this._router.navigate(routes, {
      relativeTo: this._route,
      queryParams,
      queryParamsHandling: '',
      ...extras,
    });
  }

  /**
   * Chiude la track aperta e, se all'apertura era stata tolta una ricerca, la rimette nell'URL
   * (oc:8684). Senza copia salvata si comporta come la chiusura di sempre.
   */
  closeTrack(): void {
    const savedSearch = this._savedSearch;
    this._savedSearch = null;
    const queryParams: Params = {track: undefined};
    if (savedSearch) {
      queryParams.search = savedSearch;
    }
    this.updateURL(queryParams);
  }

  /**
   * Reset the URL query params to exactly match the provided value.
   * Perform navigation only if query params differ.
   */
  resetURL(): void {
    this._store.dispatch(closeUgc());
    this._store.dispatch(closeDownloads());
    this.navigateTo();
  }

  /**
   * Merge new query params with the existing ones and update the URL.
   * Perform navigation only if query params differ.
   */
  updateURL(queryParams: Params, routes = []): void {
    const excluseField = ['track', 'poi', 'ugc_track', 'ugc_poi'];
    const oldParams = {...this._emptyParams, ...this.getCurrentQueryParams()};
    const newParams = {...oldParams, ...queryParams};

    for (let i = 0; i < excluseField.length; i++) {
      const field = excluseField[i];
      if (queryParams[field] != null) {
        const fieldsToRemove = excluseField.filter(f => f != field);
        fieldsToRemove.forEach(fieldsToRemove => {
          newParams[fieldsToRemove] = undefined;
        });
      }
    }
    // Aprire una `track` o un `poi` azzera la ricerca e ne salva una copia per la X della track.
    // Senza `search` la copia non si tocca: aprire un POI dalla track non la sovrascrive. Le
    // aperture UGC restano come prima (oc:8684).
    if (this._opensTrackOrPoiWithSearch(newParams, oldParams)) {
      this._savedSearch = this._decodeQueryParam(newParams.search);
      newParams.search = undefined;
    }
    if (JSON.stringify(newParams) !== JSON.stringify(oldParams)) {
      this._checkIfUgcIsOpened(newParams);
      this.navigateTo(routes, newParams);
    }
  }

  /**
   * Scegliere un POI direttamente chiude la navigazione fra i POI correlati, quindi azzera anche
   * `ec_related_poi` (oc:8406). Senza, quel parametro restava nell'URL: a schermo non si vedeva,
   * perché il navigatore è gated su `canNavigateRelatedPois`, ma `removeLatest()` lo consuma
   * **prima** di `poi`, e il primo "indietro" non faceva nulla di visibile.
   */
  setPoi(id: string | number): void {
    this._ugcOpened$.pipe(take(1)).subscribe(ugcOpened => {
      const queryParams = ugcOpened
        ? {ugc_poi: id ? id : undefined, poi: undefined, ec_related_poi: undefined}
        : {poi: id ? id : undefined, ugc_poi: undefined, ec_related_poi: undefined};
      this.updateURL(queryParams, ['map']);
    });
  }

  setTrack(id: string | number): void {
    this._ugcOpened$.pipe(take(1)).subscribe(ugcOpened => {
      const queryParams = ugcOpened
        ? {ugc_track: id ? id : undefined}
        : {track: id ? id : undefined};
      this.updateURL(queryParams, ['map']);
    });
  }

  /**
   * Apre un layer sulla mappa da un punto qualsiasi dell'app (non solo dalla Home,
   * dove la stessa azione passa invece per `HomeComponent.setLayer()` senza cambiare
   * route, dato che la mappa è già visibile in quel contesto).
   *
   * Usa `changeURL()` (navigazione basata sul path corrente), non `updateURL()`:
   * `updateURL()` naviga solo se i query param cambiano rispetto a quelli correnti,
   * quindi se un `layer` con lo stesso id era già in URL da una navigazione precedente
   * (es. aperto prima dalla Home) il confronto risulterebbe "invariato" e la chiamata
   * non navigherebbe affatto verso `/map` restando sulla pagina di origine.
   */
  setLayer(layer: ILAYER | {id?: string | number} | string | number | null): void {
    const id = typeof layer === 'object' && layer !== null ? layer.id : layer;
    this.changeURL('map', {layer: id ?? undefined, search: undefined});
    this._store.dispatch(setMapDetailsStatus({status: 'open'}));
  }

  /**
   * Gestisce un deep link nativo (Universal Link / App Link) ricevuto da appUrlOpen.
   * Inoltra qualsiasi path e query param dell'URL al router, così qualunque route
   * dell'app è raggiungibile da link esterno, non solo /map.
   * ugc_track/ugc_poi sono esclusi di proposito: dati personali, non raggiungibili da link pubblico.
   */
  handleDeepLink(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }

    const path = parsed.pathname.replace(/^\//, '');
    const queryParams: Params = {};
    parsed.searchParams.forEach((value, key) => {
      if (key === 'ugc_track' || key === 'ugc_poi') {
        return;
      }
      queryParams[key] = value;
    });

    const posthogProps: Record<string, any> = {url, ...queryParams};
    this._posthogClient?.capture('deepLinkOpened', posthogProps);

    this.navigateTo(path ? [path] : [], queryParams);
  }

  /**
   * Decodifica un parametro query in modo sicuro.
   * Gestisce il caso in cui il valore sia già decodificato o contenga caratteri speciali.
   */
  private _decodeQueryParam(value: string): string {
    if (!value) return value;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  /**
   * Vero se `next` apre una `track` o un `poi` diversi da quelli di `previous` mentre la ricerca è
   * ancora presente: è il caso in cui `search` si toglie e se ne salva una copia (oc:8684).
   * Aggiungere `search` con track/poi invariati non è un'apertura. Il confronto è volutamente
   * lasco (`!=`): lo stesso id può arrivare come numero da `updateURL()` e come stringa dall'URL.
   */
  private _opensTrackOrPoiWithSearch(next: Params, previous: Params): boolean {
    const opensTrack = next.track != null && next.track != previous.track;
    const opensPoi = next.poi != null && next.poi != previous.poi;
    return (opensTrack || opensPoi) && !!next.search;
  }

  private _checkIfUgcIsOpened(queryParams: Params): void {
    if (queryParams.track != null || queryParams.poi != null) {
      this._store.dispatch(closeUgc());
      this._store.dispatch(closeDownloads());
    }
    if (queryParams.ugc_track != null || queryParams.ugc_poi != null) {
      this._store.dispatch(openUgc());
    }
  }
  removeLatest(): boolean {
    const queryParams = this.getCurrentQueryParams();
    if (queryParams.gallery_index != null) {
      this.updateURL({gallery_index: undefined});
      return false;
    } else if (queryParams.ec_related_poi != null) {
      this.updateURL({ec_related_poi: undefined});
      return false;
    } else if (
      queryParams.layer != null &&
      (queryParams.poi != null || queryParams.track != null)
    ) {
      this.updateURL({poi: undefined, track: undefined});
      return false;
    } else if (queryParams.ugc_track != null || queryParams.ugc_poi != null) {
      this.updateURL({ugc_track: undefined, ugc_poi: undefined});
      return false;
    } else {
      this.resetURL();
      return true;
    }
  }

  /**
   * Traccia gli eventi PostHog quando cambia l'URL.
   * Invia un evento $pageview con le proprietà rilevanti.
   * Solo su iOS/Android - su web PostHog traccia automaticamente.
   */
  private _mobileTrackUrlChange(params: Params): void {
    if (!this._posthogClient || this._deviceService.isBrowser) {
      return;
    }

    // Costruisce l'URL completo con origin e query params
    const fullUrl = window.location.origin + this._router.url;

    const props: Record<string, any> = {
      $current_url: fullUrl,
      path: this.getCurrentPath(),
    };

    // Aggiungi proprietà rilevanti dai parametri
    if (params.layer != null) props.layer = params.layer;
    if (params.track != null) props.track = params.track;
    if (params.poi != null) props.poi = params.poi;
    if (params.search != null) props.search = params.search;

    this._posthogClient.capture('$pageview', props);
  }
}
