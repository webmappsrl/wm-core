import {Pipe, PipeTransform} from '@angular/core';
import { SliderFilter } from '../../types/config';

@Pipe({
  standalone: false,
  name: 'wmUnits',
  pure: false,
})
export class SliderFilterMeasurePipe implements PipeTransform {
  transform(value: SliderFilter, ...args: unknown[]): string {
    if (value == null) return '';
    if (typeof value === 'number') {
      return `${value}`;
    } else {
      if (value.lower == null && value.upper == null) return '';
      return `${value.lower ? ' ' + value.lower : ''}${
        value.lower != null && value.upper != null ? ' - ' : ''
      }${value.upper} ${value.units}`;
    }
  }
}
