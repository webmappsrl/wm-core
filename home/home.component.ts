import {
  ChangeDetectionStrategy,
  Component,
  Output,
  ViewEncapsulation,
  EventEmitter,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {togglePoiFilter, toggleTrackFilterByIdentifier} from '../store/api/api.actions';
import {confHOME} from '../store/conf/conf.selector';

@Component({
  selector: 'wm-home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeComponent {
  @Output() externalUrlBoxEVT: EventEmitter<string> = new EventEmitter();
  @Output() horizontalScrollBoxEVT: EventEmitter<any> = new EventEmitter();
  @Output() layerBoxEVT: EventEmitter<[any, number]> = new EventEmitter();
  @Output() poiTypeFilterBoxEVT: EventEmitter<[any, number]> = new EventEmitter();
  @Output() slugBoxEVT: EventEmitter<[string, number]> = new EventEmitter();
  @Output() tracksBoxEVT: EventEmitter<number> = new EventEmitter();
  confHOME$: Observable<IHOME[]> = this._store.select(confHOME);

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

  constructor(private _store: Store) {}
}
