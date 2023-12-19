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
} from '../../store/api/api.selector';
import {IHIT} from '../../types/elastic';

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
  @Output() trackEVT: EventEmitter<number> = new EventEmitter();

  countAll$ = this._store.select(countAll);
  countInitPois$ = this._store.select(poisInitCount);
  countPois$ = this._store.select(countPois);
  countTracks$ = this._store.select(countTracks);
  currentLayer$ = this._store.select(apiElasticStateLayer);
  lastFilterType$ = this._store.select(lastFilterType);
  pois$: Observable<any[]> = this._store.select(featureCollection).pipe(
    filter(p => p != null),
    map(p => ((p as any).features || []).map(p => (p as any).properties || [])),
  );
  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('tracks');
  tracks$: Observable<IHIT[]> = this._store.select(queryApi);
  tracksLoading$: Observable<boolean> = this._store.select(apiElasticStateLoading);

  constructor(private _store: Store) {
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
