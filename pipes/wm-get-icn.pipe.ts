import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'getIcn',
})
export class WmGetIcnPipe implements PipeTransform {
  transform(value: string, ...args: unknown[]): unknown {
    const outline = 'icn-outline-';
    if (value === 'cycling') {
      return `${outline}bike`;
    }
    if (value === 'mtb') {
      return `${outline}MTB`;
    }
    if (value === 'gravel') {
      return 'icn-cyc_gravel';
    }
    if (value === 'road-bike') {
      return 'icn-vc-road-bike';
    }
    return `${outline}${value}`;
  }
}
