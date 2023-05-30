import {Component, Host, Input, ViewEncapsulation} from '@angular/core';
import {FiltersComponent} from '../../filters/filters.component';

@Component({
  selector: 'wm-select-filter',
  templateUrl: './select-filter.component.html',
  styleUrls: ['./select-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SelectFilterComponent {
  @Input() filter: any;
  @Input() filterName: any;

  constructor(@Host() public parent: FiltersComponent) {}

  addFilter(filterType: string, filter: any): void {
    if (filterType === 'activity') {
      this.parent.filterTracksEvt.emit(filter.identifier);
    }
  }

  addPoiFilter(filter: Filter): void {
    this.parent.addPoisFilter(filter);
  }
}
