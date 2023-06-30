import { countAll } from './../../store/api/api.selector';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {
  goToHome,
  resetPoiFilters,
  resetTrackFilters,
  setLayer,
  togglePoiFilter,
  toggleTrackFilter,
} from '../../store/api/api.actions';
import {apiElasticStateLayer, apiFilterTracks, poiFilters} from '../../store/api/api.selector';

@Component({
  selector: 'wm-status-filter',
  templateUrl: './status-filter.component.html',
  styleUrls: ['./status-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusFilterComponent {
  @Output() removeLayerEVT: EventEmitter<any> = new EventEmitter();
  @Output() removePoiFilterEVT: EventEmitter<string> = new EventEmitter();
  @Output() removeTrackFilterEVT: EventEmitter<Filter> = new EventEmitter();
  @Output() resetFiltersEVT: EventEmitter<void> = new EventEmitter();

  countAll$: Observable<number> = this._store.select(countAll);
  layer$ = this._store.select(apiElasticStateLayer);
  poiFilters$: Observable<any> = this._store.select(poiFilters);
  trackFilters$: Observable<any[]> = this._store.select(apiFilterTracks);

  constructor(private _store: Store) {}

  removeLayer(layer: any): void {
    this._store.dispatch(setLayer(null));
    this._store.dispatch(resetTrackFilters());
    this.removeLayerEVT.emit(layer);
  }

  removePoiFilter(filterIdentifier: string): void {
    this._store.dispatch(togglePoiFilter({filterIdentifier}));
    this.removePoiFilterEVT.emit(filterIdentifier);
  }

  removeTrackFilter(filter: Filter): void {
    this._store.dispatch(toggleTrackFilter({filter}));
    this.removeTrackFilterEVT.emit(filter);
  }

  resetFilters(): void {
    this._store.dispatch(setLayer(null));
    this._store.dispatch(resetPoiFilters());
    this._store.dispatch(resetTrackFilters());
    this._store.dispatch(goToHome());
    this.resetFiltersEVT.emit();
  }
}
