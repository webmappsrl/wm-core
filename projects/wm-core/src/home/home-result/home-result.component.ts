import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Optional,
  Output,
  ViewEncapsulation,
} from '@angular/core';

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
import {POSTHOG_CLIENT} from '../../store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {Store} from '@ngrx/store';
import {Observable, combineLatest, from, of} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';
import {ecPoisLoaded, ecTracksLoading, poisInitCount} from '@wm-core/store/features/ec/ec.selector';

import {
  downloadsOpened,
  ecLayer,
  hasActiveRouteFilters,
  homeResultTabSelected,
  inputTyped,
  routeFilters,
  showTracks,
  ugcOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
import {confHOMELayers} from '@wm-core/store/conf/conf.selector';
import {ILAYER} from '@wm-core/types/config';
import {layerMatchesFilters} from '@wm-core/home/home-route-filters/home-route-filters.utils';
import {
  countAll,
  countPois,
  countTracks,
  pois,
  tracks,
} from '@wm-core/store/features/features.selector';
import {WmFeature} from '@wm-types/feature';
import {HomeResultTab} from '@wm-types/user-activity';
import {Point} from 'geojson';
import {Hit} from '@wm-types/elastic';
import {getEcTracks, removeEcTrack} from '@wm-core/utils/localForage';
import {LangService} from '@wm-core/localization/lang.service';
import {AlertController} from '@ionic/angular';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {GeolocationService} from '@wm-core/services/geolocation.service';
import {setHomeResultTabSelected} from '@wm-core/store/user-activity/user-activity.action';
import {
  HOME_RESULT_EMPTY_MESSAGES,
  HomeResultEmptyState,
  homeResultEmptyState,
} from './home-result-empty-state';
import {homeResultTab, HomeResultTabResult} from './home-result-tab';

@Component({
  standalone: false,
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent {
  @Output() layerEVT: EventEmitter<ILAYER> = new EventEmitter<ILAYER>();
  @Output() poiEVT: EventEmitter<number | string> = new EventEmitter();
  @Output() refreshDownloads: EventEmitter<void> = new EventEmitter<void>();
  @Output() trackEVT: EventEmitter<number | string> = new EventEmitter();

  countAll$ = this._store.select(countAll);
  countInitPois$ = this._store.select(poisInitCount);
  countPois$: Observable<number> = this._store.select(countPois);
  countTracks$: Observable<number> = this._store.select(countTracks);
  currentLayer$ = this._store.select(ecLayer);
  downaloadOpened$ = this._store.select(downloadsOpened);
  downloadsTracks$ = this.refreshDownloads.pipe(
    startWith(undefined), // Emetti un valore iniziale per avviare il flusso
    switchMap(() =>
      from(getEcTracks()).pipe(map(t => t.map(track => track.properties as unknown as Hit))),
    ),
  );
  ectracks$ = this._store.select(tracks);
  emptyState$: Observable<HomeResultEmptyState>;
  readonly emptyMessages = HOME_RESULT_EMPTY_MESSAGES;
  pois$: Observable<WmFeature<Point>[]> = this._store.select(pois).pipe(
    switchMap(pois =>
      pois?.length
        ? combineLatest([
            ...pois.map(poi =>
              this._geolocationSvc.getDistanceFromCurrentLocation$(poi.geometry?.coordinates).pipe(
                map(distance => ({
                  ...poi,
                  properties: {
                    ...poi.properties,
                    distanceFromCurrentLocation: distance,
                  },
                })),
              ),
            ),
          ])
        : of([]),
    ),
  );
  filteredLayers$: Observable<ILAYER[]>;
  countLayers$: Observable<number>;
  hasActiveRouteFilters$: Observable<boolean> = this._store.select(hasActiveRouteFilters);
  showResultTabSelected$: Observable<HomeResultTab>;
  showTracks$ = this._store.select(showTracks);
  tracks$: Observable<Hit[]>;
  /** Pulsante Tracks visibile: calcolato da `homeResultTab`, non va ricalcolato nel template. */
  tracksTabVisible$: Observable<boolean>;
  /** Pulsante POI visibile: calcolato da `homeResultTab`, non va ricalcolato nel template. */
  poisTabVisible$: Observable<boolean>;
  tracksLoading$: Observable<boolean> = this._store.select(ecTracksLoading);
  ugcOpened$: Observable<boolean> = this._store.select(ugcOpened);

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    private _alertCtrl: AlertController,
    private _urlHandlerSvc: UrlHandlerService,
    private _geolocationSvc: GeolocationService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    this.filteredLayers$ = combineLatest([
      this._store.select(confHOMELayers),
      this._store.select(inputTyped),
      this._store.select(routeFilters),
    ]).pipe(
      debounceTime(300),
      map(([layers, input, filters]) => {
        const hasInput = !!input && input.trim() !== '';
        const hasFilters = Object.values(filters ?? {}).some(v => Array.isArray(v) && v.length > 0);
        // Nessun testo digitato e nessun filtro attivo: comportamento invariato, nessun risultato
        // (la lista completa resta visibile nella griglia Home, non qui).
        if (!hasInput && !hasFilters) return [];
        if (!layers) return [];
        const normalized = hasInput ? normalizeString(input) : '';
        return layers.filter(layer => {
          if (hasInput) {
            if (!layer.title) return false;
            const title = this._langSvc.instant(layer.title as any);
            if (!title || typeof title !== 'string') return false;
            if (!normalizeString(title).includes(normalized)) return false;
          }
          return layerMatchesFilters(layer, filters ?? {});
        });
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a.map(l => l.id)) === JSON.stringify(b.map(l => l.id))),
    );

    this.countLayers$ = this.filteredLayers$.pipe(map(layers => layers.length));

    // Decide quale messaggio di stato vuoto mostrare; con un messaggio la barra dei tab è nascosta
    // (oc:8765). Le regole di visibilità stanno in homeResultEmptyState e homeResultTab: il template
    // legge tracksTabVisible$ e poisTabVisible$ invece di ricalcolare i pulsanti (oc:8933).
    this.emptyState$ = combineLatest([
      this.countAll$,
      this.countLayers$,
      this.hasActiveRouteFilters$,
      this.currentLayer$,
      this.tracksLoading$,
      this.ugcOpened$,
      this.showTracks$,
      this.countPois$,
      this._store.select(ecPoisLoaded),
    ]).pipe(
      map(
        ([
          countAll,
          countLayers,
          hasActiveRouteFilters,
          currentLayer,
          tracksLoading,
          ugcOpened,
          showTracks,
          countPois,
          poisLoaded,
        ]) =>
          homeResultEmptyState({
            countAll,
            countLayers,
            hasActiveRouteFilters,
            hasCurrentLayer: currentLayer != null,
            tracksLoading,
            ugcOpened,
            showTracks,
            countPois,
            poisLoaded,
          }),
      ),
      distinctUntilChanged(),
    );

    const homeResultTab$: Observable<HomeResultTabResult> = combineLatest([
      this.countTracks$,
      this.countPois$,
      this.countLayers$,
      this._store.select(homeResultTabSelected),
      this.showTracks$,
      this._store.select(ecLayer).pipe(startWith(null)),
      this.hasActiveRouteFilters$,
    ]).pipe(
      map(([countTracks, countPois, countLayers, userSelectedTab, showTracks, currentLayer, hasActiveRouteFilters]) =>
        homeResultTab({
          countTracks,
          countPois,
          countLayers,
          userSelectedTab,
          showTracks,
          hasCurrentLayer: currentLayer != null,
          hasActiveRouteFilters,
        }),
      ),
      // Una sola sottoscrizione condivisa: senza, ogni async ripartirebbe dal debounce di
      // countLayers$ e il pulsante Tracks comparirebbe dopo la barra.
      shareReplay({bufferSize: 1, refCount: true}),
    );
    this.showResultTabSelected$ = homeResultTab$.pipe(
      map(result => result.tab),
      distinctUntilChanged(),
    );
    this.tracksTabVisible$ = homeResultTab$.pipe(
      map(result => result.tracksTabVisible),
      distinctUntilChanged(),
    );
    this.poisTabVisible$ = homeResultTab$.pipe(
      map(result => result.poisTabVisible),
      distinctUntilChanged(),
    );

    this.tracks$ = combineLatest([
      this.ectracks$,
      this.downloadsTracks$,
      this.downaloadOpened$,
    ]).pipe(
      map(([ectracks, downloadsTracks, downloadsOpened]) => {
        if (downloadsOpened) {
          return downloadsTracks;
        }
        return ectracks;
      }),
      switchMap(tracks =>
        tracks?.length
          ? combineLatest(
              tracks.map(track =>
                this._geolocationSvc.getDistanceFromCurrentLocation$(track.start).pipe(
                  map(distance => ({
                    ...track,
                    distanceFromCurrentLocation: distance,
                  })),
                ),
              ),
            )
          : of([]),
      ),
    );
  }

  changeResultType(event): void {
    const tab = event.target.value;
    this._posthogClient?.capture('homeResultTabSelected', {
      tab,
    });
    this._store.dispatch(setHomeResultTabSelected({tab}));
  }

  async removeDownloads(event: Event, id: string): Promise<void> {
    event.stopPropagation();
    const alert = await this._alertCtrl.create({
      header: this._langSvc.instant('Attenzione'),
      message: this._langSvc.instant('Sei sicuro di voler eliminare la traccia?'),
      buttons: [
        this._langSvc.instant('Annulla'),
        {
          text: this._langSvc.instant('elimina'),
          handler: async () => {
            await removeEcTrack(`${id}`);
            this.refreshDownloads.emit();
          },
        },
      ],
    });
    alert.present().then();
  }

  setPoi(f: WmFeature<Point>): void {
    const id = f?.properties?.id ?? f?.properties?.uuid ?? null;
    this._urlHandlerSvc.setPoi(id);
    this.poiEVT.emit(id);
  }

  setLayer(layer: ILAYER): void {
    this.layerEVT.emit(layer);
  }

  setTrack(id: string | number): void {
    this._urlHandlerSvc.setTrack(id);
    this.trackEVT.emit(id);
  }
}
