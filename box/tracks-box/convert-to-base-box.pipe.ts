import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'convertToItemTracks',
})
export class ConvertToItemTracksPipe implements PipeTransform {
  transform(value: IHOMEITEM[]): IHOMEITEMTRACK[] {
    return value as IHOMEITEMTRACK[];
  }
}
