import {Pipe, PipeTransform} from '@angular/core';
import { IPhotoItem } from 'wm-core/services/photo.service';
@Pipe({
  name: 'wmCreateBlob',
  pure: false,
})
export class WmCreateBlobPipe implements PipeTransform {
  transform(photo: IPhotoItem): string {
    if (photo.rawData) {
      if (typeof photo.rawData === 'string' && photo.rawData.includes('blob:')) {
        return photo.rawData;
      }
      const rawData = JSON.parse(photo.rawData);
      if (rawData.arrayBuffer != null) {
        const url = `data:image/jpg;base64, ${this._arrayBufferToBase64(rawData.arrayBuffer)}`;
        return url;
      }
    }

    return photo.photoURL;
  }

  private _arrayBufferToBase64(buffer): string {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
