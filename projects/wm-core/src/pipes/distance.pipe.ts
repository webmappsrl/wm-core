import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'distance',
})
export class DistancePipe implements PipeTransform {
  transform(value: number, distance: 'km' | 'm' = 'km', precision: number = 0): string {
    if (value != null && distance === 'km') {
      return `${(value).toFixed(precision)} km`;
    }
    if (value != null && distance === 'm') {
      return `${(value).toFixed(precision)} m`;
    }
    return `${value}`;
  }
}
