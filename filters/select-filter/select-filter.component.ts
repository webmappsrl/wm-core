import {ChangeDetectionStrategy, Component, Host, Input, ViewEncapsulation} from '@angular/core';

import {FiltersComponent} from '../../filters/filters.component';

@Component({
  selector: 'wm-select-filter',
  templateUrl: './select-filter.component.html',
  styleUrls: ['./select-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SelectFilterComponent {
  @Input() filter: any;
  @Input() filterName: any;

  constructor(@Host() public parent: FiltersComponent) {}

  addFilter(filterType: string, filterIdentifier: string): void {}
}
