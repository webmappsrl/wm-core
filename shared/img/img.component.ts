import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {IWmImage} from 'src/app/types/model';
import {defaultImageB64} from './defaultImageB64';

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
          return of(src);
        } else {
          return from(defaultImageB64.image);
        }
      }),
    );
  }
}
