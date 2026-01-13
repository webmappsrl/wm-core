import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, combineLatest, from, of} from 'rxjs';
import {distinctUntilChanged, map, startWith, switchMap, throttleTime} from 'rxjs/operators';
import {ecTracksLoading, poisInitCount} from '@wm-core/store/features/ec/ec.selector';

import {
  downloadsOpened,
  ecLayer,
  homeResultTabSelected,
  lastFilterType,
  showTracks,
  ugcOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
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
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent {
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
  showResultTabSelected$ = combineLatest([
    this.countTracks$,
    this.countPois$,
    this._store.select(homeResultTabSelected),
    this.lastFilterType$,
  ]).pipe(
    map(([countTracks, countPois, userSelectedTab, lastFilterType]) => {
      // Use lastFilterType as priority if available, otherwise use userSelectedTab
      const preferredTab = lastFilterType ?? userSelectedTab;

      // If user manually selected a tab and that tab has results, respect the selection
      if (preferredTab === 'tracks' && countTracks > 0) {
        return 'tracks';
      }
      if (preferredTab === 'pois' && countPois > 0) {
        return 'pois';
      }

      // Otherwise, automatic selection based on availability
      if (countTracks > 0) {
        return 'tracks'; // Priority to tracks if available
      }
      if (countPois > 0) {
        return 'pois'; // If there are no tracks but there are pois
      }

      // No results available
      return null;
    }),
    distinctUntilChanged(), // Avoid duplicate emissions
  ) as Observable<HomeResultTab>;
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
  ) {
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
    this._store.dispatch(setHomeResultTabSelected({tab: event.target.value}));
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

  setTrack(id: string | number): void {
    this._urlHandlerSvc.setTrack(id);
    this.trackEVT.emit(id);
  }
}
