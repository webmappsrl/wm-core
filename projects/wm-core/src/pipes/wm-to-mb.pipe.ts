import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'wmToMb',
})
export class WmToMbPipe implements PipeTransform {
  transform(size: number): string {
    const million = 1000000;
    if (size > million) {
      return `${Math.round(size / million)} MB`;
    } else {
      return `${Math.round((size * 100) / million) / 100} MB`;
    }
  }
}
