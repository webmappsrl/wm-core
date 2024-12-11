import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';

import {poiFilters} from '@wm-core/store/features/ec/ec.selector';
import {Filter} from '@wm-core/types/config';
import {Observable} from 'rxjs';
import {Location} from '@angular/common';
import {
  closeUgc,
  goToHome,
  resetPoiFilters,
  resetTrackFilters,
  setLayer,
  togglePoiFilter,
  toggleTrackFilter,
} from '@wm-core/store/user-activity/user-activity.action';
import {countAll} from '@wm-core/store/features/features.selector';
import {ecLayer, filterTracks} from '@wm-core/store/user-activity/user-activity.selector';
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
  layer$ = this._store.select(ecLayer);
  poiFilters$: Observable<any> = this._store.select(poiFilters);
  trackFilters$: Observable<any[]> = this._store.select(filterTracks);

  constructor(private _store: Store, private _location: Location) {}

  cleanUrl(): void {
    const baseUrl = this._location.path().split('?')[0].split('#')[0]; // Ottiene solo '/map'
    this._location.replaceState(baseUrl); // Aggiorna l'URL senza ricaricare la pagina
  }

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
    this._store.dispatch(closeUgc());
    this._store.dispatch(goToHome());
    this.cleanUrl();
    this.resetFiltersEVT.emit();
  }
}
