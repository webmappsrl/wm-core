import {Pipe, PipeTransform} from '@angular/core';
import {Feature} from 'geojson';
@Pipe({
  name: 'wmCreateBlob',
  pure: false,
})
export class WmCreateBlobPipe implements PipeTransform {
  transform(feature: Feature): string {
    const properties = feature.properties;
    const rawData = properties.rawData;
    const photo = properties.photo;
    if (photo) {
      return photo.webPath;
    } else if (rawData) {
      if (typeof properties.rawData === 'string' && properties.rawData.includes('blob:')) {
        return properties.rawData;
      }
      if (rawData.arrayBuffer != null) {
        const url = `data:image/jpg;base64, ${this._arrayBufferToBase64(rawData.arrayBuffer)}`;
        return url;
      }
    }

    return properties.url;
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
