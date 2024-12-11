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
import {map} from 'rxjs/operators';
import {ecTracksLoading, poisInitCount} from '@wm-core/store/features/ec/ec.selector';

import {
  ecLayer,
  lastFilterType,
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

@Component({
  selector: 'wm-home-result',
  templateUrl: './home-result.component.html',
  styleUrls: ['./home-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeResultComponent implements OnDestroy {
  private _resultTypeSub$: Subscription = Subscription.EMPTY;

  @Output() poiEVT: EventEmitter<WmFeature<Point>> = new EventEmitter();
  @Output() trackEVT: EventEmitter<number | string> = new EventEmitter();

  countAll$ = this._store.select(countAll);
  countInitPois$ = this._store.select(poisInitCount);
  countPois$: Observable<number> = this._store.select(countPois);
  countTracks$: Observable<number> = this._store.select(countTracks);
  currentLayer$ = this._store.select(ecLayer);
  lastFilterType$ = this._store.select(lastFilterType);
  pois$: Observable<WmFeature<Point>[]> = this._store.select(pois);
  showResultType$: BehaviorSubject<string> = new BehaviorSubject<string>('tracks');
  tracks$ = this._store.select(tracks);
  tracksLoading$: Observable<boolean> = this._store.select(ecTracksLoading);
  ugcOpened$: Observable<boolean> = this._store.select(ugcOpened);

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
