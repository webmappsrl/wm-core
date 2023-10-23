import {Pipe, PipeTransform} from '@angular/core';
import { IHOMEITEM, IHORIZONTALSCROLLBOXITEM } from '../../types/config';

@Pipe({
  name: 'convertToHorizontalScrollboxItems',
})
export class ConvertToHorizontalScrollBoxItemsPipe implements PipeTransform {
  transform(value: IHOMEITEM[]): IHORIZONTALSCROLLBOXITEM[] {
    return value as IHORIZONTALSCROLLBOXITEM[];
  }
}
