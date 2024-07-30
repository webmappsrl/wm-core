import {ChangeDetectionStrategy, Component, Input, OnDestroy, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {defaultImageB64} from './defaultImageB64';
import { IWmImage } from '../../types/model';
import { OfflineCallbackManager } from './offlineCallBackManager';
@Component({
  selector: 'wm-img',
  templateUrl: './img.component.html',
  styleUrls: ['./img.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmImgComponent implements OnDestroy {
  private _loadSrcEVT$: BehaviorSubject<IWmImage | string | null> = new BehaviorSubject<
    IWmImage | string | null
  >(null);
  private networkStatus$ = new BehaviorSubject<boolean>(navigator.onLine);
  private updateNetworkStatus = () => {
    this.networkStatus$.next(navigator.onLine);
  };

  @Input('src') set setSrc(src: IWmImage | string | null) {
    if (src == null) {
      src = './assets/images/photosuccess.png';
    }
    this._loadSrcEVT$.next(src);
  }

  @Input('size') size: string;

  public image$: Observable<string | ArrayBuffer | null> = of(null);

  constructor() {
    window.addEventListener('online', this.updateNetworkStatus);
    window.addEventListener('offline', this.updateNetworkStatus);
    this.image$ = this._loadSrcEVT$.pipe(
      switchMap(src => 
        this.networkStatus$.pipe(
          switchMap(isOnline => {
            const offlineFn = OfflineCallbackManager.getOfflineCallback();
            if (!isOnline && offlineFn != null) {
              if (typeof src === 'string') {
                return from(offlineFn(src));
              } else if (src.url) {
                return from(offlineFn(src.url));
              } else {
                return from(defaultImageB64.image);
              }
            } else {
              if (typeof src === 'string') {
                return of(src);
              } else if (src.api_url) {
                if (src.sizes != null && this.size != null && src.sizes[this.size] != null) {
                  return of(src.sizes[this.size]);
                } else {
                  return of(src.url);
                }
              } else {
                return from(defaultImageB64.image);
              }
            }
          }),
          map(image => {
            if (image instanceof ArrayBuffer) {
              const blob = new Blob([image], { type: 'image/jpeg' }); // Adatta il tipo MIME
              return URL.createObjectURL(blob);
            }
            return image;
          })
        )
      )
    );
  }

  ngOnDestroy() {
    // Rimuovi gli event listener quando il componente viene distrutto
    window.removeEventListener('online', this.updateNetworkStatus);
    window.removeEventListener('offline', this.updateNetworkStatus);
  }
}
