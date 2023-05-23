import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import {BehaviorSubject} from 'rxjs';
import {IonModal} from '@ionic/angular';
import {FeatureCollection} from 'geojson';

@Component({
  selector: 'wm-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FilterComponent implements OnChanges {
  @Input() filters: {[filter: string]: any[]};
  @Input() pois: FeatureCollection;
  @Input() stats: {
    [name: string]: {[identifier: string]: any};
  } = {};
  @Output() selectedFilters: EventEmitter<string[]> = new EventEmitter<string[]>();
  @ViewChild(IonModal) modal: IonModal;

  currentFilters$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentTab$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  tabs$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  addFilter(filter: string): void {
    let currentFilters = this.currentFilters$.value;
    const indexOfFilter = currentFilters.indexOf(filter);
    if (indexOfFilter >= 0) {
      this.currentFilters$.next(currentFilters.filter(e => e !== filter));
    } else {
      this.currentFilters$.next([...this.currentFilters$.value, filter]);
    }
    this.selectedFilters.emit(this.currentFilters$.value);
  }

  cancel() {
    this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    this.modal.dismiss(this.currentFilters$.value, 'confirm');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes?.filters?.currentValue != null) {
      const keys = Object.keys(this.filters);
      this.tabs$.next(['poi_type']);
      this.currentTab$.next(keys[0]);
    }
  }

  reset(): void {
    this.currentFilters$.next([]);
    this.selectedFilters.emit(this.currentFilters$.value);
  }

  segmentChanged(event: any): void {
    this.currentTab$.next(event);
  }

  setFilter(filter: string): void {
    this.selectedFilters.emit([filter]);
    this.currentFilters$.next([filter]);
  }
}
