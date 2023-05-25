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
  @Output() selectedFilters: EventEmitter<string[]> = new EventEmitter<string[]>();

  currentFilterIdentifiers$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentFilters$: BehaviorSubject<Filter[]> = new BehaviorSubject<Filter[]>([]);
  currentTab$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  tabs$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  addFilter(filter: Filter): void {
    let currentFilterIdentifiers = this.currentFilterIdentifiers$.value;
    const indexOfFilter = currentFilterIdentifiers.indexOf(filter.identifier);
    if (indexOfFilter >= 0) {
      this.currentFilterIdentifiers$.next(
        currentFilterIdentifiers.filter(e => e !== filter.identifier),
      );
      const currentFilter = this.currentFilters$.value;
      currentFilter.splice(indexOfFilter, 1);
      this.currentFilters$.next(currentFilter);
    } else {
      this.currentFilterIdentifiers$.next([
        ...this.currentFilterIdentifiers$.value,
        filter.identifier,
      ]);
      this.currentFilters$.next([...this.currentFilters$.value, filter]);
    }
    console.log(this.currentFilterIdentifiers$.value);
    this.selectedFilters.emit(this.currentFilterIdentifiers$.value);
  }

  reset(): void {
    this.currentFilterIdentifiers$.next([]);
    this.selectedFilters.emit(this.currentFilterIdentifiers$.value);
  }

  setFilter(filter: string): void {
    this.selectedFilters.emit([filter]);
    this.currentFilterIdentifiers$.next([filter]);
  }
}
