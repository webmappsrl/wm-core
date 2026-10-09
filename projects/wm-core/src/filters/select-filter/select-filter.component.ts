import {Component, Host, Input, ViewEncapsulation} from '@angular/core';
import {FiltersComponent} from '../filters.component';
import {SelectFilter, SelectFilterOption} from '../../types/config';

@Component({
  standalone: false,
  selector: 'wm-select-filter',
  templateUrl: './select-filter.component.html',
  styleUrls: ['./select-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SelectFilterComponent {
  @Input() filter: SelectFilter;
  @Input() filterName: string;

  constructor(@Host() public parent: FiltersComponent) {}

  /**
   * Una tipologia è visibile se ha un conteggio, oppure se è selezionata (anche a zero),
   * così l'utente può sempre deselezionarla.
   */
  isPoiOptionVisible(
    identifier: string,
    // Stesso tipo di `FiltersComponent.poisStats$`: un tipo più stretto passa i test ma rompe il
    // controllo dei template della build di produzione (oc:8684)
    stats: {[id: string]: unknown},
    selected: (string | {identifier: string})[],
  ): boolean {
    if (stats?.[identifier] != null) return true;
    return (selected ?? []).some(s => (typeof s === 'string' ? s : s?.identifier) === identifier);
  }

  addPoiFilter(filter: SelectFilterOption): void {
    this.parent.addPoisFilter({...filter, ...{type: 'select'}});
  }
}
