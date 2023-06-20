import {countAll} from './../../store/api/api.selector';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {
  apiElasticStateLoading,
  countPois,
  countTracks,
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
export class WmHomeResultComponent implements OnChanges {
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

  changeResultType(event): void {
    this.showResultType$.next(event.target.value);
  }
  constructor(private _store: Store) {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.pois != null && changes.pois.currentValue != null) {
      this.showResultType$.next('pois');
    }
  }
}
