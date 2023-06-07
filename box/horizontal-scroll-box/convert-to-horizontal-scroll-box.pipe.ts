import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'convertToHorizontalScrollboxItems',
})
export class ConvertToHorizontalScrollBoxItemsPipe implements PipeTransform {
  transform(value: IHOMEITEM[]): IHORIZONTALSCROLLBOXITEM[] {
    return value as IHORIZONTALSCROLLBOXITEM[];
  }
}
