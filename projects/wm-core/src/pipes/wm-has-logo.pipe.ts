import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'hasLogo',
  pure: true,
})
export class WmHasLogoPipe implements PipeTransform {
  transform(logoImage: string | null | undefined): boolean {
    return typeof logoImage === 'string' && logoImage.trim().length > 0;
  }
}
