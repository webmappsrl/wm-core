import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'isSelected',
  pure: false,
})
export class WmIsSelected implements PipeTransform {
  transform(currentFilterIdentifier: string, selectedFilters: SelectFilterOption[]): string {
    if (selectedFilters.length === 0) return '';
    const selectedFilterIdentifiers = selectedFilters.map(f => f.identifier);
    if (selectedFilterIdentifiers.indexOf(currentFilterIdentifier) < 0) return '';
    return 'success';
  }
}
