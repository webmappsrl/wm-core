import {Component, Host, Input, ViewEncapsulation} from '@angular/core';
import {FiltersComponent} from '../filters.component';
import {SelectFilter, SelectFilterOption} from '../../types/config';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {ICONS} from '@wm-types/config';
import {icons} from '@wm-core/store/icons/icons.selector';

@Component({
  selector: 'wm-select-filter',
  templateUrl: './select-filter.component.html',
  styleUrls: ['./select-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SelectFilterComponent {
  @Input() filter: SelectFilter;
  @Input() filterName: string;

  icons$: Observable<ICONS> = this._store.select(icons);

  constructor(@Host() public parent: FiltersComponent, private _store: Store) {}

  addPoiFilter(filter: SelectFilterOption): void {
    this.parent.addPoisFilter({...filter, ...{type: 'select'}});
  }
}
