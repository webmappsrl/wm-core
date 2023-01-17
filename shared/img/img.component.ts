import {BehaviorSubject, Observable, from, of} from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {shareReplay, startWith, switchMap, tap} from 'rxjs/operators';

import {DownloadService} from 'src/app/services/download.service';
import {IWmImage} from 'src/app/types/model';
import defaultImage from 'src/assets/images/defaultImageB64.json';

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

  constructor(private download: DownloadService) {
    this.image$ = this._loadSrcEVT$.pipe(
      switchMap(src => {
        if (typeof src === 'string') {
          return of(src);
        } else {
          return from(this.loadImage(src));
        }
      }),
    );
  }

  loadImage(imageSrc: IWmImage | string): Promise<string | ArrayBuffer> {
    if (!imageSrc) return;
    let url = imageSrc as string;
    if (typeof imageSrc !== 'string') {
      if (this.size && imageSrc.sizes[this.size]) {
        url = imageSrc.sizes[this.size];
      }
    }
    return this.download.getB64img(url);
  }
}
