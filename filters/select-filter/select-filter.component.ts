import {
  ChangeDetectionStrategy,
  Component,
  Host,
  Input,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

import {FiltersComponent} from '../../filters/filters.component';

@Component({
  selector: 'wm-select-filter',
  templateUrl: './select-filter.component.html',
  styleUrls: ['./select-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SelectFilterComponent implements OnChanges {
  @Input() filter: any;
  @Input() filterName: any;

  constructor(@Host() public parent: FiltersComponent) {}

  addFilter(filterType: string, filter: any): void {
    console.log(filterType, filter);
    if (filterType === 'activity') {
      this.parent.filterTracksEvt.emit(filter.identifier);
    }
  }
  ngOnChanges(changes: SimpleChanges) {
    console.log(changes);
  }
  addPoiFilter(filter: Filter): void {
    this.parent.addPoisFilter(filter);
  }
}
