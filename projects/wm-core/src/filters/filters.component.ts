import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChange,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable} from 'rxjs';
import {
  countSelectedFilters,
  poiFilters,
  poisStats,
  trackStats,
} from '../store/features/ec/ec.selector';
import {confFILTERS} from '../store/conf/conf.selector';
import {SelectFilterOption, SliderFilter, Filter} from '../types/config';
import {FilterType} from '@wm-types/user-activity';
import {countPois, countTracks} from '@wm-core/store/features/features.selector';
import {filterTracks} from '@wm-core/store/user-activity/user-activity.selector';
import {
  resetPoiFilters,
  resetTrackFilters,
  toggleTrackFilter,
} from '@wm-core/store/user-activity/user-activity.action';

@Component({
  standalone: false,
  selector: 'wm-filters',
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FiltersComponent implements OnChanges {
  @Input() set wmFiltersClose(selector: string) {
    if (selector != 'wm-filters') {
      this.toggle$.next(false);
    }
  }

  @Output() filterPoisEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() filterTracksEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() lastFilterTypeEvt: EventEmitter<FilterType> = new EventEmitter();
  @Output() removefilterPoiEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() removefilterTracksEvt: EventEmitter<Filter> = new EventEmitter<Filter>();
  @Output() resetFiltersEvt: EventEmitter<void> = new EventEmitter<void>();

  confFILTERS$: Observable<{[key: string]: any} | undefined> = this._store.select(confFILTERS);
  countPois$: Observable<number> = this._store.select(countPois);
  countSelectedFilters$: Observable<number> = this._store.select(countSelectedFilters);
  countTracks$: Observable<number> = this._store.select(countTracks);
  poiFilters$: Observable<any> = this._store.select(poiFilters);
  poisStats$: Observable<{
    [name: string]: {[identifier: string]: any};
  }> = this._store.select(poisStats);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  trackFilters$: Observable<any> = this._store.select(filterTracks);
  trackStats$: Observable<{
    [name: string]: {[identifier: string]: any};
  }> = this._store.select(trackStats);

  constructor(private _store: Store) {}

  ngOnChanges(changes: SimpleChanges): void {
    //TODO: workaround per eliminare un filtro slider dalla home,
    //approfondire perche si debba cancellarlo due volte migliorare il codice evitando questo changes
    Object.keys(changes).forEach(key => {
      const change: SimpleChange = changes[key];
      if (key === 'trackFilters') {
        const diff = change.previousValue?.filter(x => !change.currentValue.includes(x)) || [];
        diff
          .filter(d => d.type && d.type === 'slider')
          .forEach(filter => {
            //   this.removefilterTracksEvt.emit(filter);
            //   this.removefilterTracksEvt.emit(filter);
          });
      }
    });
  }

  addPoisFilter(filter: any): void {
    this.lastFilterTypeEvt.emit('pois');
    this.filterPoisEvt.emit(filter);
  }

  addTrackFilter(filter: SelectFilterOption, taxonomy?: string): void {
    this.lastFilterTypeEvt.emit('tracks');
    this.filterTracksEvt.emit({...filter, taxonomy});
  }

  filterBtnClick(): void {
    this.toggle$.next(!this.toggle$.value);
  }

  removePoiFilter(filter: SelectFilterOption): void {
    this.removefilterPoiEvt.emit(filter);
  }

  removeTrackFilter(filter: Filter): void {
    this._store.dispatch(toggleTrackFilter({filter}));
  }

  resetFilters(): void {
    this._store.dispatch(resetTrackFilters());
    this._store.dispatch(resetPoiFilters());
  }
}
