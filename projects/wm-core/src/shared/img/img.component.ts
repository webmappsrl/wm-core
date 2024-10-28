import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {defaultImageB64} from './defaultImageB64';
import {IWmImage} from '../../types/model';
import {OfflineCallbackManager} from './offlineCallBackManager';
import {getImg} from 'wm-core/utils/localForage';
@Component({
  selector: 'wm-img',
  templateUrl: './img.component.html',
  styleUrls: ['./img.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmImgComponent {
  private _loadSrcEVT$: BehaviorSubject<IWmImage | string | null> = new BehaviorSubject<
    IWmImage | string | null
  >(null);
  private networkStatus$ = new BehaviorSubject<boolean>(navigator.onLine);

  @Input('src') set setSrc(src: IWmImage | string | null) {
    if (src == null) {
      src = './assets/images/photosuccess.png';
    }
    this._loadSrcEVT$.next(src);
  }

  @Input('size') size: string;

  public image$: Observable<string | ArrayBuffer | null> = of(null);

  constructor() {
    this.image$ = this._loadSrcEVT$.pipe(
      switchMap(src => {
        if (typeof src === 'string') {
          return from(getImg(src));
        } else if (src.url) {
          return from(getImg(src.url));
        } else {
          return from(defaultImageB64.image);
        }
      }),
      map(image => {
        if (image instanceof ArrayBuffer) {
          const blob = new Blob([image], {type: 'image/jpeg'}); // Adatta il tipo MIME
          return URL.createObjectURL(blob);
        }
        return image;
      }),
    );
  }
}
