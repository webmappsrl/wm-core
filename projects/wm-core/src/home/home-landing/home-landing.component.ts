import {
  ChangeDetectionStrategy,
  Component,
  Output,
  ViewEncapsulation,
  EventEmitter,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {confHOME} from '@wm-core/store/conf/conf.selector';
import {IHOME, IHORIZONTALSCROLLBOX} from '@wm-core/types/config';
import {
  togglePoiFilter,
  toggleTrackFilterByIdentifier,
} from '@wm-core/store/user-activity/user-activity.action';
import {countUgcAll} from '@wm-core/store/features/ugc/ugc.selector';
import {offline} from '@wm-core/store/network/network.selector';

@Component({
  selector: 'wm-home-landing',
  templateUrl: './home-landing.component.html',
  styleUrls: ['./home-landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLandingComponent {
  @Output() externalUrlBoxEVT: EventEmitter<string> = new EventEmitter();
  @Output() horizontalScrollBoxEVT: EventEmitter<any> = new EventEmitter();
  @Output() layerBoxEVT: EventEmitter<[any, number]> = new EventEmitter();
  @Output() poiTypeFilterBoxEVT: EventEmitter<[any, number]> = new EventEmitter();
  @Output() poisBoxEVT: EventEmitter<number> = new EventEmitter();
  @Output() slugBoxEVT: EventEmitter<[string, number]> = new EventEmitter();
  @Output() tracksBoxEVT: EventEmitter<number> = new EventEmitter();
  @Output() ugcBoxEvt: EventEmitter<boolean> = new EventEmitter();

  confHOME$: Observable<IHOME[] | undefined> = this._store.select(confHOME);
  countAllUgc$: Observable<number> = this._store.select(countUgcAll);
  isLogged$: Observable<boolean> = this._store.select(isLogged);
  offline$: Observable<boolean> = this._store.select(offline);

  constructor(private _store: Store) {}

  sendHorizontalScrollBoxEVT(identifier: string, box: IHORIZONTALSCROLLBOX): void {
    const filter = {identifier, taxonomy: box.item_type};
    this._setFilter(filter);
    this.horizontalScrollBoxEVT.emit(filter);
  }

  sendPoiTypeFilterBoxEVT(box: any, idx: number): void {
    const filter = {identifier: box.identifier, taxonomy: 'poi_types'};
    this._setFilter(filter);
    this.poiTypeFilterBoxEVT.emit([filter, idx]);
  }

  private _setFilter(filter: {identifier: string; taxonomy: string}): void {
    if (filter == null) return;
    if (filter.taxonomy === 'poi_types') {
      this._store.dispatch(togglePoiFilter({filterIdentifier: filter.identifier}));
    } else {
      this._store.dispatch(
        toggleTrackFilterByIdentifier({identifier: filter.identifier, taxonomy: filter.taxonomy}),
      );
    }
  }
}
