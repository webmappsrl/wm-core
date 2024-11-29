import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, Subscription, combineLatest} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {
  apiElasticStateLoading,
  countPois,
  countTracks,
  countAll,
  featureCollection,
  queryApi,
  apiElasticStateLayer,
  poisInitCount,
  lastFilterType,
} from '@wm-core/store/api/api.selector';
import {IHIT} from '@wm-core/types/elastic';
import {countUgcTracks, opened, syncing, ugcTracks} from '@wm-core/store/ugc/ugc.selector';

@Component({
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent implements OnDestroy {
  private _resultTypeSub$: Subscription = Subscription.EMPTY;

  @Output() poiEVT: EventEmitter<any> = new EventEmitter();
  @Output() trackEVT: EventEmitter<number | string> = new EventEmitter();

  countAll$ = this._store.select(countAll);
  countEcTracks$ = this._store.select(countTracks);
  countInitPois$ = this._store.select(poisInitCount);
  countPois$ = this._store.select(countPois);
  countTracks$: Observable<number>;
  countUgcTracks$ = this._store.select(countUgcTracks);
  currentLayer$ = this._store.select(apiElasticStateLayer);
  ecTracks$: Observable<IHIT[]> = this._store.select(queryApi);
  lastFilterType$ = this._store.select(lastFilterType);
  pois$: Observable<any[]> = this._store.select(featureCollection).pipe(
    filter(p => p != null),
    map(p => ((p as any).features || []).map(p => (p as any).properties || [])),
  );
  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('tracks');
  tracks$: Observable<IHIT[]>;
  tracksLoading$: Observable<boolean> = combineLatest([
    this._store.select(apiElasticStateLoading),
  ]).pipe(map(([apiLoading]) => apiLoading));
  ugcOpened$: Observable<boolean> = this._store.select(opened);
  ugcTracks$: Observable<IHIT[]> = this._store.select(ugcTracks);

  constructor(private _store: Store) {
    this.countTracks$ = combineLatest([
      this.countEcTracks$,
      this.countUgcTracks$,
      this.ugcOpened$,
    ]).pipe(map(([ecTracks, ugcTracks, ugcOpened]) => (ugcOpened ? ugcTracks : ecTracks)));
    this.tracks$ = combineLatest([this.ecTracks$, this.ugcTracks$, this.ugcOpened$]).pipe(
      map(([ecTracks, ugcTracks, ugcOpened]) => (ugcOpened ? ugcTracks : ecTracks)),
    );
    this._resultTypeSub$ = combineLatest([
      this.countTracks$,
      this.countPois$,
      this.countInitPois$,
      this.lastFilterType$,
    ])
      .pipe(
        map(([tracks, pois, initPois, lastFilterType]) => {
          if (
            lastFilterType != null &&
            lastFilterType === 'pois' &&
            pois != null &&
            pois > 0 &&
            pois != null &&
            pois < initPois
          ) {
            return 'pois';
          } else if (tracks != null && tracks > 0) {
            return 'tracks';
          } else {
            return 'pois';
          }
        }),
      )
      .subscribe(value => {
        this.showResultType$.next(value);
      });
  }

  ngOnDestroy(): void {
    this._resultTypeSub$.unsubscribe();
  }

  changeResultType(event): void {
    this.showResultType$.next(event.target.value);
  }
}
