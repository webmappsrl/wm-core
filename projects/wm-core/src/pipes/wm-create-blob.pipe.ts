import {Pipe, PipeTransform} from '@angular/core';
import {Photo} from '@capacitor/camera';
@Pipe({
  standalone: false,
  name: 'wmCreateBlob',
  pure: false,
})
export class WmCreateBlobPipe implements PipeTransform {
  transform(photo: Photo): string {
    if (photo && photo.webPath) {
      return photo.webPath;
    }
    return '';
  }
}
