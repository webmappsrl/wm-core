import {Component, Host, Input, ViewEncapsulation} from '@angular/core';
import {FiltersComponent} from '../../filters/filters.component';

@Component({
  selector: 'wm-select-filter',
  templateUrl: './select-filter.component.html',
  styleUrls: ['./select-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SelectFilterComponent {
  @Input() filter: SelectFilter;
  @Input() filterName: string;

  constructor(@Host() public parent: FiltersComponent) {}

  addPoiFilter(filter: SelectFilterOption): void {
    this.parent.addPoisFilter(filter);
  }
}
