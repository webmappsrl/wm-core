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
  @Input() confFilters: {[key: string]: any};
  @Input() poiFilters: Filter[];
  @Input() pois: FeatureCollection;
  @Input() poisStats: {
    [name: string]: {[identifier: string]: any};
  } = {};
  @Input() trackFilters: any[];
  @Output() filterPoisEvt: EventEmitter<string> = new EventEmitter<string>();
  @Output() filterTracksEvt: EventEmitter<string> = new EventEmitter<string>();
  @Output() removefilterPoiEvt: EventEmitter<string> = new EventEmitter<string>();
  @Output() removefilterTracksEvt: EventEmitter<string> = new EventEmitter<string>();
  @Output() resetFiltersEvt: EventEmitter<void> = new EventEmitter<void>();

  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  addPoisFilter(filter: Filter): void {
    this.filterPoisEvt.emit(filter.identifier);
  }

  addTrackFilter(filter: Filter): void {
    this.filterTracksEvt.emit(filter.identifier);
  }

  filterBtnClick(): void {
    console.log(this.toggle$.value);
    this.toggle$.next(!this.toggle$.value);
  }

  removePoiFilter(filter: Filter): void {
    this.removefilterPoiEvt.emit(filter.identifier);
  }

  removeTrackFilter(filter): void {
    this.removefilterTracksEvt.emit(filter.identifier);
  }
  resetFilters(): void {
    this.resetFiltersEvt.emit();
  }
}
