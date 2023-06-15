import {Pipe, PipeTransform} from '@angular/core';
import {RangeValue} from './slider-filter.component';

@Pipe({
  name: 'wmmeasure',
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
