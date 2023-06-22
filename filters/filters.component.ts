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
  apiFilterTracks,
  countPois,
  countSelectedFilters,
  countTracks,
  poiFilters,
  poisStats,
  trackStats,
} from '../store/api/api.selector';
import {confFILTERS} from '../store/conf/conf.selector';

@Component({
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
  @Output() removefilterPoiEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() removefilterTracksEvt: EventEmitter<Filter> = new EventEmitter<Filter>();
  @Output() resetFiltersEvt: EventEmitter<void> = new EventEmitter<void>();

  confFILTERS$: Observable<{[key: string]: any}> = this._store.select(confFILTERS);
  countSelectedFilters$: Observable<number> = this._store.select(countSelectedFilters);
  countPois$: Observable<number> = this._store.select(countPois);
  countTracks$: Observable<number> = this._store.select(countTracks);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  poisStats$: Observable<{
    [name: string]: {[identifier: string]: any};
  }> = this._store.select(poisStats);
  trackStats$: Observable<{
    [name: string]: {[identifier: string]: any};
  }> = this._store.select(trackStats);
  poiFilters$: Observable<any> = this._store.select(poiFilters);
  trackFilters$: Observable<any> = this._store.select(apiFilterTracks);
  constructor(private _store: Store) {}

  addPoisFilter(filter: any): void {
    this.filterPoisEvt.emit(filter);
  }

  addTrackFilter(filter: SelectFilterOption, taxonomy?: string): void {
    this.filterTracksEvt.emit({...filter, taxonomy});
  }

  filterBtnClick(): void {
    this.toggle$.next(!this.toggle$.value);
  }

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

  removePoiFilter(filter: SelectFilterOption): void {
    this.removefilterPoiEvt.emit(filter);
  }

  removeTrackFilter(filter: Filter): void {
    this.removefilterTracksEvt.emit(filter);
  }

  resetFilters(): void {
    this.resetFiltersEvt.emit();
  }
}
