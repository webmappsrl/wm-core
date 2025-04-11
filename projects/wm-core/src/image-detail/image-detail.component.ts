import {AfterViewInit, ChangeDetectionStrategy, Component, ViewChild, ViewEncapsulation} from "@angular/core";
import {beforeInit, setTransition, setTranslate} from "@wm-core/image-gallery/utils";
import {IonSlides} from "@ionic/angular";
import {Store} from "@ngrx/store";
import {UrlHandlerService} from "@wm-core/services/url-handler.service";
import {currentEcImageGallery, currentEcImageGalleryIndex} from "@wm-core/store/features/ec/ec.selector";
import {from, Observable} from "rxjs";
import {map, take} from "rxjs/operators";

@Component({
  selector: 'wm-image-detail',
  templateUrl: './image-detail.component.html',
  styleUrls: ['./image-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ImageDetailComponent implements AfterViewInit{
  @ViewChild('gallery') slider: IonSlides;

  currentImageGallery$: Observable<any[]> = this._store.select(currentEcImageGallery);
  currentImageGalleryIndex$: Observable<number> = this._store.select(currentEcImageGalleryIndex).pipe(
    map(index => index + 1)
  );

  slideOptions = {
    on: {
      beforeInit,
      setTranslate,
      setTransition,
    },
  };

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {}

  ngAfterViewInit(): void {
    this.currentImageGalleryIndex$.pipe(take(1)).subscribe(index => {
      this.slider.slideTo(index);
    });
  }

  async updateIdx(): Promise<void> {
    const currentIdx = await this.slider.getActiveIndex();
    this._urlHandlerSvc.updateURL({gallery_index: currentIdx});
  }

  prev(): void {
    from(this.slider.slidePrev()).pipe(take(1)).subscribe(async () => {
      const currentIdx = await this.slider.getActiveIndex();
      this._urlHandlerSvc.updateURL({gallery_index: currentIdx});
    });
  }

  next(): void {
    from(this.slider.slideNext()).pipe(take(1)).subscribe(async () => {
      const activeIndex = await this.slider.getActiveIndex();
      this._urlHandlerSvc.updateURL({gallery_index: activeIndex});
    });
  }
}
