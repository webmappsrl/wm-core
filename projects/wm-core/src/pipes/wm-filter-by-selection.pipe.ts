import {Pipe, PipeTransform} from '@angular/core';
import { SelectFilterOption } from '../types/config';

@Pipe({
  standalone: false,
  name: 'orderedBySelection',
  pure: false,
})
export class WmOrderedBySelection implements PipeTransform {
  transform(items: SelectFilterOption[], filters: SelectFilterOption[]): SelectFilterOption[] {
    const filterIdentifiers = filters.map(f => f.identifier);
    if (filterIdentifiers.length > 0) {
      return [
        ...items.filter(item => filterIdentifiers.indexOf(item.identifier) >= 0),
        ...items.filter(item => filterIdentifiers.indexOf(item.identifier) < 0),
      ];
    } else {
      return items;
    }
  }
}
