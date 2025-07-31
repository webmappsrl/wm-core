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
    if (value === 'mtb' || value === 'e-bike' || value === 'touring-bike' || value === 'mountain-bike' || value === 'road-bike' ) {
      return `${outline}MTB`;
    }
    if (value === 'gravel') {
      return 'icon-cyc_gravel';
    }
    if (value === 'road-bike') {
      return 'icon-vc-road-bike';
    }
    if (value === 'art-and-culture') {
      return 'icon-temples';
    }
    if (value === 'tourism') {
      return 'icon-star';
    }
     if (value === 'train-trekking') {
      return 'icon-train';
    }
    if (value === 'ciaspole') {
      return 'icon-outline-nordic-walking';
    }
    if (value === 'adventure') {
      return 'icon-fill-trekking';
    }
    if (value === 'swimming-snorkeling') {
      return 'icon-swimming';
    }
    if (value === 'birdwatching') {
      return 'icon-binoculars';
    }
    if (value === 'oeno-gastronomy') {
      return 'icon-restaurant';
    }
    if (value === 'joelette') {
      return 'icon-wheelchair';
    }
    if (value === 'by-car') {
      return 'icon-outline-bike_3';
    }
    if (value === 'culture-history') {
      return 'icon-temples';
    }
    if (value === 'environmental-education') {
      return 'icon-outline-lake';
    }
    if (value === 'eating-sleeping') {
      return 'icon-restaurant';
    }
    return `${outline}${value}`;
  }
}
