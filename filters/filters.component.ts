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

export interface Filter {
  identifier: string;
  name: any;
  icon: string;
  taxonomy?: string;
  color?: string;
}

@Component({
  selector: 'wm-filters',
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FiltersComponent {
  @Input() confFilters: any;
  @Input() pois: FeatureCollection;
  @Input() poisStats: {
    [name: string]: {[identifier: string]: any};
  } = {};
  @Output() filterPois: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() filterActivities: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() removeFilterActivities: EventEmitter<string> = new EventEmitter<string>();

  currentPoiFilterIdentifiers$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentPoiFilters$: BehaviorSubject<Filter[]> = new BehaviorSubject<Filter[]>([]);
  currentTrackFilterIdentifiers$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentTrackFilters$: BehaviorSubject<Filter[]> = new BehaviorSubject<Filter[]>([]);
  currentTab$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  tabs$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  addPoisFilter(filter: Filter): void {
    console.log(filter);
    let currentPoiFilterIdentifiers = this.currentPoiFilterIdentifiers$.value;
    const indexOfFilter = currentPoiFilterIdentifiers.indexOf(filter.identifier);
    if (indexOfFilter >= 0) {
      this.currentPoiFilterIdentifiers$.next(
        currentPoiFilterIdentifiers.filter(e => e !== filter.identifier),
      );
      const currentFilter = this.currentPoiFilters$.value;
      currentFilter.splice(indexOfFilter, 1);
      this.currentPoiFilters$.next(currentFilter);
    } else {
      this.currentPoiFilterIdentifiers$.next([
        ...this.currentPoiFilterIdentifiers$.value,
        filter.identifier,
      ]);
      this.currentPoiFilters$.next([...this.currentPoiFilters$.value, filter]);
    }
    console.log(this.currentPoiFilterIdentifiers$.value);
    this.filterPois.emit(this.currentPoiFilterIdentifiers$.value);
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
    this.filterActivities.emit([filter.identifier]);
  }
  removeTrackFilter(filter): void {
    let currentTrackFilterIdentifiers = this.currentTrackFilterIdentifiers$.value;
    let currentTrackFilter = this.currentTrackFilters$.value;
    const indexOfFilter = currentTrackFilterIdentifiers.indexOf(filter.identifier);
    currentTrackFilterIdentifiers.splice(indexOfFilter, 1);
    currentTrackFilter.splice(indexOfFilter, 1);
    this.currentTrackFilterIdentifiers$.next(currentTrackFilterIdentifiers);
    this.currentTrackFilters$.next(currentTrackFilter);

    this.removeFilterActivities.emit(filter.identifier);
  }
}
