import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {FeatureCollection} from 'geojson';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-filters',
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FiltersComponent {
  @Input() set wmFiltersClose(selector: string) {
    if (selector != 'wm-filters') {
      this.toggle$.next(false);
    }
  }

  @Input() confFilters: {[key: string]: any};
  @Input() poiFilters: SelectFilterOption[];
  @Input() pois: FeatureCollection;
  @Input() poisStats: {
    [name: string]: {[identifier: string]: any};
  } = {};
  @Input() trackFilters: any[];
  @Input() trackStats: {
    [name: string]: {[identifier: string]: any};
  } = {};
  @Output() filterPoisEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() filterTracksEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() removefilterPoiEvt: EventEmitter<SelectFilterOption | SliderFilter | Filter> =
    new EventEmitter<SelectFilterOption | SliderFilter | Filter>();
  @Output() removefilterTracksEvt: EventEmitter<Filter> = new EventEmitter<Filter>();
  @Output() resetFiltersEvt: EventEmitter<void> = new EventEmitter<void>();

  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  addPoisFilter(filter: any): void {
    this.filterPoisEvt.emit(filter);
  }

  addTrackFilter(filter: SelectFilterOption, taxonomy?: string): void {
    this.filterTracksEvt.emit({...filter, taxonomy});
  }

  filterBtnClick(): void {
    this.toggle$.next(!this.toggle$.value);
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
