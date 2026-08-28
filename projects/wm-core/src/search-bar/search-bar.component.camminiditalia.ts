import {ChangeDetectionStrategy, Component, Inject, Optional, ViewEncapsulation} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {ILAYER} from '@wm-core/types/config';
import {confMAPLayers, confShowRouteFilters} from '@wm-core/store/conf/conf.selector';
import {routeFilters} from '@wm-core/store/user-activity/user-activity.selector';
import {routeFiltersChanged} from '@wm-core/store/user-activity/user-activity.action';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {Language} from '@wm-types/language';
import {
  FilterOption,
  RouteFilterKey,
  RouteFilterState,
  SEASONS,
  WALKING_NETWORKS,
} from '@wm-types/config';
import {DISTANCE_BUCKETS, STAGE_COUNT_BUCKETS} from '@wm-core/constants/route-filters';
import {SearchBarBaseComponent} from './search-bar-base.component';
import {
  fixedListValueOptions,
  fixedSingleValueOptions,
  hasActiveFilters,
  listValueOptions,
  numericBucketOptions,
  singleValueOptions,
} from '../home/home-route-filters/home-route-filters.utils';

interface RouteFilterOptionsByKey {
  distance: FilterOption[];
  stageCount: FilterOption[];
  shape: FilterOption[];
  walkingNetwork: FilterOption[];
  regions: FilterOption[];
  themes: FilterOption[];
  seasons: FilterOption[];
}

/**
 * Variante camminiditalia di `wm-searchbar` (oc:8414, `fileReplacements` in `core/angular.json`):
 * estende `SearchBarBaseComponent` (ricerca invariata, condivisa con tutti gli shard) aggiungendo
 * sopra il pannello "Cerca il tuo cammino" — toggle + 7 filtri ad accordion che filtrano
 * client-side, in tempo reale, la lista dei cammini mostrata in Home. Visibile solo se almeno un
 * layer ha `attributes` popolato (`confShowRouteFilters`), nessun flag `OPTIONS` dedicato.
 */
@Component({
  standalone: false,
  selector: 'wm-searchbar',
  templateUrl: './search-bar.component.camminiditalia.html',
  styleUrls: ['./search-bar.component.camminiditalia.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmSearchBarComponent extends SearchBarBaseComponent {
  /** Chiave del filtro attualmente espanso, o `null` se tutti chiusi (apertura esclusiva). */
  openKey: RouteFilterKey | null = null;
  /** Selezione corrente, dispatchata allo store ad ogni variazione (aggiornamento live della lista). */
  draft: RouteFilterState = {};
  /** `true` se il pannello dei 7 filtri è visibile (toggle a icona cursori). */
  panelOpen = false;

  /** `true` se almeno un layer della config ha `attributes` — gate del toggle/pannello filtri. */
  showFilters$: Observable<boolean> = this._store.select(confShowRouteFilters);

  options$: Observable<RouteFilterOptionsByKey> = this._store.select(confMAPLayers).pipe(
    map((layers: ILAYER[]) => this._deriveOptions(layers ?? [])),
  );

  constructor(
    fb: FormBuilder,
    protected _store: Store<any>,
    protected _urlHandlerSvc: UrlHandlerService,
    private _langSvc: LangService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    super(fb, _store, _urlHandlerSvc);
    this._store.select(routeFilters).subscribe(filters => {
      this.draft = filters ?? {};
    });
  }

  get hasActiveFilters(): boolean {
    return hasActiveFilters(this.draft);
  }

  /** Apre/chiude il pannello dei 7 filtri (icona cursori accanto alla search box). */
  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  /**
   * Espande/collassa la riga `key` (apertura esclusiva: aprirne una chiude l'eventuale altra aperta).
   * @param key Chiave del filtro alternato.
   */
  toggleRow(key: RouteFilterKey): void {
    this.openKey = this.openKey === key ? null : key;
  }

  /**
   * Aggiorna la selezione di `key` e la dispatcha subito allo store — la lista Home si aggiorna
   * live, come richiesto dal ticket ("al variare dei filtri").
   * @param key Chiave del filtro modificato.
   * @param values Nuova selezione per quel filtro.
   */
  onSelectionChange(key: RouteFilterKey, values: string[]): void {
    this.draft = {...this.draft, [key]: values};
    this._store.dispatch(routeFiltersChanged({filters: this.draft}));
    this._posthogClient?.capture('filterUsed', {
      filter_type: 'route',
      filter_id: key,
      filter_name: values.join(','),
    });
  }

  /** "Azzera filtri": svuota la selezione e la dispatcha allo store. */
  resetFilters(): void {
    this.draft = {};
    this._store.dispatch(routeFiltersChanged({filters: {}}));
  }

  private _deriveOptions(layers: ILAYER[]): RouteFilterOptionsByKey {
    const lang = (this._langSvc.currentLang as Language) ?? 'it';
    const kmUnit = this._langSvc.instant('km');
    const tappeUnit = this._langSvc.instant('tappe');
    return {
      distance: numericBucketOptions(layers, 'distance', DISTANCE_BUCKETS, kmUnit),
      stageCount: numericBucketOptions(layers, 'stage_count', STAGE_COUNT_BUCKETS, tappeUnit),
      shape: singleValueOptions(layers, 'shape', lang, ['discontinuous']),
      // Portata e Stagioni: vocabolario CHIUSO, stesso enum del backend (OsmWalkingNetwork/Season)
      // — mostra sempre tutti i valori possibili (anche a count 0), etichetta da i18n statico
      // (chiave = codice enum, es. 'lwn'/'spring'), non dai dati (che potrebbero non averla mai).
      walkingNetwork: fixedSingleValueOptions(
        layers,
        'walking_network',
        WALKING_NETWORKS,
        value => this._langSvc.instant(value),
      ),
      regions: listValueOptions(layers, 'taxonomy_where', lang),
      themes: listValueOptions(layers, 'themes', lang),
      seasons: fixedListValueOptions(layers, 'season', SEASONS, value => this._langSvc.instant(value)),
    };
  }
}
