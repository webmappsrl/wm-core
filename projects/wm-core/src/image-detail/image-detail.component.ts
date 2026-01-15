import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, ViewEncapsulation} from "@angular/core";
import {WmSwiperComponent} from '@wm-core/swiper/swiper.component';
import {Store} from "@ngrx/store";
import {UrlHandlerService} from "@wm-core/services/url-handler.service";
import {currentEcImageGallery, currentEcImageGalleryIndex} from "@wm-core/store/features/ec/ec.selector";
import {from, Observable} from "rxjs";
import {map, take} from "rxjs/operators";
import {confOPTIONSShowMediaName} from "@wm-core/store/conf/conf.selector";
import {EffectFade} from 'swiper/modules';

@Component({
  standalone: false,
  selector: 'wm-image-detail',
  templateUrl: './image-detail.component.html',
  styleUrls: ['./image-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ImageDetailComponent implements AfterViewInit{
  @ViewChild('gallery') slider: WmSwiperComponent;

  confOPTIONSShowMediaName$: Observable<boolean> = this._store.select(confOPTIONSShowMediaName);
  currentImageGallery$: Observable<any[]> = this._store.select(currentEcImageGallery);
  currentImageGalleryIndex$: Observable<number> = this._store.select(currentEcImageGalleryIndex).pipe(
    map(index => index + 1)
  );

  slideOptions = {
    modules: [EffectFade],
    slidesPerView: 1,
    slidesPerGroup: 1,
    watchSlidesProgress: true,
    spaceBetween: 0,
    effect: 'fade',
    fadeEffect: {crossFade: true}
  };

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {}

  ngAfterViewInit(): void {
    this.currentImageGalleryIndex$.pipe(take(1)).subscribe(index => {
      const swiper = this.slider?.swiper;
      if (swiper) {
        swiper.slideTo(index - 1);
      }
    });
  }

  updateIdx(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      this._urlHandlerSvc.updateURL({gallery_index: swiper.activeIndex});
    }
  }

  prev(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      swiper.slidePrev();
      this._urlHandlerSvc.updateURL({gallery_index: swiper.activeIndex});
    }
  }

  next(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      swiper.slideNext();
      this._urlHandlerSvc.updateURL({gallery_index: swiper.activeIndex});
    }
  }
}
