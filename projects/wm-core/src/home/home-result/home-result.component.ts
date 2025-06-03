import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, Subscription, combineLatest, from, of} from 'rxjs';
import {debounceTime, filter, map, startWith, switchMap, take, tap} from 'rxjs/operators';
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
export class WmHomeResultComponent implements OnDestroy {
  private _homeResultTabSelectedSub$: Subscription = Subscription.EMPTY;

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
      pois?.length ? combineLatest([
        ...pois.map(poi =>
          this._geolocationSvc.getDistanceFromCurrentLocation$(poi.geometry?.coordinates).pipe(
            map(distance => ({
              ...poi,
              properties: {
                ...poi.properties,
                distanceFromCurrentLocation: distance
              }
            }))
          )
        )
      ]) : of([])
    )
  );
  showTracks$ = this._store.select(showTracks);
  tracks$: Observable<Hit[]>;
  tracksLoading$: Observable<boolean> = this._store.select(ecTracksLoading);
  ugcOpened$: Observable<boolean> = this._store.select(ugcOpened);
  homeResultTabSelected$ = this._store.select(homeResultTabSelected);

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
                this._geolocationSvc
                  .getDistanceFromCurrentLocation$(track.start)
                  .pipe(
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
    this._homeResultTabSelectedSub$ = this.homeResultTabSelected$.pipe(
      take(1),
      switchMap(tab => {
        if (tab !== null) {
          return of(null);
        }

        return combineLatest([
          this.countTracks$,
          this.countPois$,
          this.countInitPois$,
          this.lastFilterType$,
        ]).pipe(
          debounceTime(150),
          take(1),
          map(([tracks, pois, initPois, lastFilterType]) => {
            if (
              lastFilterType === 'pois' &&
              pois != null &&
              pois > 0 &&
              pois < initPois
            ) {
              return 'pois';
            } else if (tracks != null && tracks > 0) {
              return 'tracks';
            } else {
              return 'pois';
            }
          })
        );
      }),
      filter((tab): tab is 'pois' | 'tracks' => tab !== null)
    ).subscribe(tab => {
      this._store.dispatch(setHomeResultTabSelected({ tab }));
    });
  }

  ngOnDestroy(): void {
    this._homeResultTabSelectedSub$.unsubscribe();
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
