import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'distance',
})
export class DistancePipe implements PipeTransform {
  transform(value: number, distance: 'km' | 'm' = 'km', precision: number = 0, format: 'text' | 'html' = 'text'): string {
    if (value != null && distance === 'km') {
      return format === 'html'
        ? `<span class="value">${(value).toFixed(precision)}</span> <span class="unit">km</span>`
        : `${(value).toFixed(precision)} km`;
    }
    if (value != null && distance === 'm') {
      return format === 'html'
        ? `<span class="value">${(value).toFixed(precision)}</span> <span class="unit">m</span>`
        : `${(value).toFixed(precision)} m`;
    }
    return `${value}`;
  }
}
