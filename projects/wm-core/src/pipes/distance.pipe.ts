import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'distance',
})
export class DistancePipe implements PipeTransform {
  transform(value: number, distance = 'km'): string {
    if (value != null && distance === 'km') {
      return `${Math.trunc(value)} km`;
    }
    if (value != null && distance === 'm') {
      return `${Math.trunc(value)} m`;
    }
    return `${value}`;
  }
}
