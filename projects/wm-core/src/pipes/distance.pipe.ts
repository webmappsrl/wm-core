import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'distance',
  standalone: false,
})
export class DistancePipe implements PipeTransform {
  transform(value: number, distance: 'auto' | 'km' | 'm' = 'km', precision: number = 0, format: 'text' | 'html' = 'text'): string {
    if(value != null && distance === 'auto') {
      if(value > 1000) {
        return format === 'html' ? `<span class="value">${(value / 1000).toFixed(precision)}</span> <span class="unit">km</span>` : `${(value / 1000).toFixed(precision)} km`;
      } else {
        return format === 'html' ? `<span class="value">${value.toFixed(precision)}</span> <span class="unit">m</span>` : `${value.toFixed(precision)} m`;
      }
    }
    if (value != null && distance === 'km') {
      return format === 'html' ? `<span class="value">${(value).toFixed(precision)}</span> <span class="unit">km</span>` : `${(value).toFixed(precision)} km`;
    }
    if (value != null && distance === 'm') {
      return format === 'html' ? `<span class="value">${(value).toFixed(precision)}</span> <span class="unit">m</span>` : `${(value).toFixed(precision)} m`;
    }
    return `${value}`;
  }
}
