import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'wmSort'
})
export class WmSortPipe implements PipeTransform {
  transform(array: any[], field: string, ascending: boolean = true): any[] {
    if (!array || !field) return array;

    const arrayCopy = [...array];

    return arrayCopy.sort((a, b) => {
      const aValue = this.getPropertyValue(a, field);
      const bValue = this.getPropertyValue(b, field);

      if (aValue === undefined && bValue === undefined) return 0;

      if (aValue === undefined) return ascending ? 1 : -1;
      if (bValue === undefined) return ascending ? -1 : 1;

      if (aValue < bValue) return ascending ? -1 : 1;
      if (aValue > bValue) return ascending ? 1 : -1;
      return 0;
    });
  }

  private getPropertyValue(obj: any, path: string): any {
    try {
      return path.split('.').reduce((o, i) => o?.[i], obj);
    } catch {
      return undefined;
    }
  }
}
