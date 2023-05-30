import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
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
export class FiltersComponent implements OnChanges {
  @Input() confFilters: any;
  @Input() poiFilters: Filter[];
  @Input() pois: FeatureCollection;
  @Input() poisStats: {
    [name: string]: {[identifier: string]: any};
  } = {};
  @Output() filterPoisEvt: EventEmitter<string> = new EventEmitter<string>();
  @Output() filterTracksEvt: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() removefilterPoiEvt: EventEmitter<string> = new EventEmitter<string>();
  @Output() removefilterTracksEvt: EventEmitter<string> = new EventEmitter<string>();

  currentPoiFilterIdentifiers$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentTrackFilterIdentifiers$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentTrackFilters$: BehaviorSubject<Filter[]> = new BehaviorSubject<Filter[]>([]);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  addPoisFilter(filter: Filter): void {
    this.filterPoisEvt.emit(filter.identifier);
  }

  addTrackFilter(filter: Filter): void {
    let currentTrackFilterIdentifiers = this.currentTrackFilterIdentifiers$.value;
    const indexOfFilter = currentTrackFilterIdentifiers.indexOf(filter.identifier);
    if (indexOfFilter >= 0) {
      this.currentTrackFilterIdentifiers$.next(
        currentTrackFilterIdentifiers.filter(e => e !== filter.identifier),
      );
      const currentFilter = this.currentTrackFilters$.value;
      currentFilter.splice(indexOfFilter, 1);
      this.currentTrackFilters$.next(currentFilter);
    } else {
      this.currentTrackFilterIdentifiers$.next([
        ...this.currentTrackFilterIdentifiers$.value,
        filter.identifier,
      ]);
      this.currentTrackFilters$.next([...this.currentTrackFilters$.value, filter]);
    }
    console.log(this.currentTrackFilterIdentifiers$.value);
    this.filterTracksEvt.emit([filter.identifier]);
  }

  filterBtnClick(): void {
    this.toggle$.next(!this.toggle$.value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (changes.poiFilters && changes.poiFilters.currentValue != null) {
      let currentPoiFilterIdentifiers = changes.poiFilters.currentValue.map(f => f.identifier);
      this.currentTrackFilterIdentifiers$.next(currentPoiFilterIdentifiers);
    }
  }

  removePoiFilter(filter: Filter): void {
    this.removefilterPoiEvt.emit(filter.identifier);
  }

  removeTrackFilter(filter): void {
    let currentTrackFilterIdentifiers = this.currentTrackFilterIdentifiers$.value;
    let currentTrackFilter = this.currentTrackFilters$.value;
    const indexOfFilter = currentTrackFilterIdentifiers.indexOf(filter.identifier);
    currentTrackFilterIdentifiers.splice(indexOfFilter, 1);
    currentTrackFilter.splice(indexOfFilter, 1);
    this.currentTrackFilterIdentifiers$.next(currentTrackFilterIdentifiers);
    this.currentTrackFilters$.next(currentTrackFilter);

    this.removefilterTracksEvt.emit(filter.identifier);
  }
}
