import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'getIcn',
})
export class WmGetIcnPipe implements PipeTransform {
  transform(value: string, ...args: unknown[]): unknown {
    const outline = 'icon-outline-';
    if (value === 'cycling') {
      return `${outline}bike`;
    }
    if (value === 'mtb') {
      return `${outline}MTB`;
    }
    if (value === 'gravel') {
      return 'icon-cyc_gravel';
    }
    if (value === 'road-bike') {
      return 'icon-vc-road-bike';
    }
    return `${outline}${value}`;
  }
}
