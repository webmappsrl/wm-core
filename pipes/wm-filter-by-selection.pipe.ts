import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'orderedBySelection',
  pure: false,
})
export class WmOrderedBySelection implements PipeTransform {
  transform(items: any[], filters: string[]): any {
    if (filters.length > 0) {
      return [
        ...items.filter(item => filters.indexOf(item.identifier) >= 0),
        ...items.filter(item => filters.indexOf(item.identifier) < 0),
      ];
    } else {
      return items;
    }
  }
}
