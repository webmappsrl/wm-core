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
import {debounceTime, distinctUntilChanged, map, startWith, switchMap, throttleTime} from 'rxjs/operators';
import {ecTracksLoading, poisInitCount} from '@wm-core/store/features/ec/ec.selector';

import {
  downloadsOpened,
  ecLayer,
  homeResultTabSelected,
  inputTyped,
  lastFilterType,
  showTracks,
  ugcOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
import {confHOMELayers} from '@wm-core/store/conf/conf.selector';
import {ILAYER} from '@wm-core/types/config';
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
  lastFilterType$ = this._store.select(lastFilterType);
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
  showResultTabSelected$: Observable<HomeResultTab>;
  showTracks$ = this._store.select(showTracks);
  tracks$: Observable<Hit[]>;
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
    ]).pipe(
      debounceTime(300),
      map(([layers, input]) => {
        if (!input || input.trim() === '') return [];
        if (!layers) return [];
        const normalized = normalizeString(input);
        return layers.filter(layer => {
          if (!layer.title) return false;
          const title = this._langSvc.instant(layer.title as any);
          if (!title || typeof title !== 'string') return false;
          return normalizeString(title).includes(normalized);
        });
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a.map(l => l.id)) === JSON.stringify(b.map(l => l.id))),
    );

    this.countLayers$ = this.filteredLayers$.pipe(map(layers => layers.length));

    this.showResultTabSelected$ = combineLatest([
      this.countTracks$,
      this.countPois$,
      this.countLayers$,
      this._store.select(homeResultTabSelected),
      this.lastFilterType$,
      this._store.select(ecLayer).pipe(startWith(null)),
    ]).pipe(
      map(([countTracks, countPois, countLayers, userSelectedTab, lastFilterType, currentLayer]) => {
        // Se un layer è già aperto, il tab layers non esiste nell'UI — mai restituirlo
        const layersAvailable = countLayers > 0 && !currentLayer;

        // Rispetta la scelta esplicita dell'utente (userSelectedTab != null)
        if (userSelectedTab === 'tracks' && countTracks > 0) return 'tracks';
        if (userSelectedTab === 'pois' && countPois > 0) return 'pois';
        if (userSelectedTab === 'layers' && layersAvailable) return 'layers';

        // Default automatico (nessuna selezione esplicita): layers prima, poi tracks, poi pois
        if (layersAvailable) return 'layers';
        if (countTracks > 0) return 'tracks';
        if (countPois > 0) return 'pois';

        return null;
      }),
      distinctUntilChanged(),
    ) as Observable<HomeResultTab>;

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
