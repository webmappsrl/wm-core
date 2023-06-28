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
} from '../../store/api/api.selector';

@Component({
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent implements OnDestroy {
  @Output() poiEVT: EventEmitter<any> = new EventEmitter();
  @Output() trackEVT: EventEmitter<number> = new EventEmitter();

  countTracks$ = this._store.select(countTracks);
  countPois$ = this._store.select(countPois);
  countAll$ = this._store.select(countAll);
  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('tracks');
  tracks$: Observable<IHIT[]> = this._store.select(queryApi);
  pois$: Observable<any[]> = this._store.select(featureCollection).pipe(
    filter(p => p != null),
    map(p => ((p as any).features || []).map(p => (p as any).properties || [])),
  );
  tracksLoading$: Observable<boolean> = this._store.select(apiElasticStateLoading);
  private _resultTypeSub$: Subscription = Subscription.EMPTY;

  changeResultType(event): void {
    this.showResultType$.next(event.target.value);
  }

  constructor(private _store: Store) {
    this._resultTypeSub$ = combineLatest([this.countTracks$, this.countPois$])
      .pipe(
        map(([tracks, pois]) => {
          if ((tracks > 0 && pois === 0) || (tracks > 0 && pois > 0)) {
            return 'tracks';
          } else if (pois > 0 && tracks === 0) {
            return 'pois';
          } else {
            return 'none';
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
}
