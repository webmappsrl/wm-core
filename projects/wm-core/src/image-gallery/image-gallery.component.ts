import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {WmSwiperComponent} from '@wm-core/swiper/swiper.component';
import {IonModal, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {ModalImageComponent} from '@wm-core/modal-image/modal-image.component';
import {confIsMobile} from '@wm-core/store/conf/conf.selector';
import {BehaviorSubject, Observable} from 'rxjs';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {
  WM_IMAGE_DETAIL_PRESENTATION,
  WmImageDetailPresentation,
} from '@wm-core/image-detail/image-detail-presentation';
import {confOPTIONSShowMediaName} from '@wm-core/store/conf/conf.selector';
@Component({
  standalone: false,
  selector: 'wm-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageGalleryComponent {
  @Input() set imageGallery(imgGallery: any[]) {
    if (imgGallery && imgGallery.length === 1) {
      this.sliderOptions$.next({
        slidesPerView: 1,
      });
    } else {
      this.sliderOptions$.next({
        slidesPerView: 'auto',
        spaceBetween: 12,
      });
    }
    this.imageGallery$.next(imgGallery);
  }

  @ViewChild(IonModal) modal: IonModal;
  @ViewChild('slider') slider: WmSwiperComponent;

  imageGallery$: BehaviorSubject<null | any[]> = new BehaviorSubject<null | any[]>(null);
  confOPTIONSShowMediaName$: Observable<boolean> = this._store.select(confOPTIONSShowMediaName);
  isMobile$: Observable<boolean> = this._store.select(confIsMobile);
  sliderOptions$: BehaviorSubject<any> = new BehaviorSubject<any>({
    slidesPerView: 1.3,
    centeredSlides: true,
    spaceBetween: 10,
  });

  constructor(
    private _modalCtrl: ModalController,
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    @Inject(WM_IMAGE_DETAIL_PRESENTATION)
    private _presentation: WmImageDetailPresentation,
  ) {}

  next(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      swiper.slideNext();
    }
  }

  prev(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      swiper.slidePrev();
    }
  }

  /**
   * Apre il dettaglio dell'immagine. `wm-image-detail` è lo stesso componente su entrambe le
   * piattaforme, cambia solo il contenitore: sul web è avvolto da `ModalImageComponent`
   * (fullscreen, con il proprio pulsante di chiusura), nell'app è montato inline dal pannello
   * dei dettagli, che lo mostra quando `gallery_index` è valorizzato.
   *
   * **Il contenitore lo dichiara il prodotto**, con `WM_IMAGE_DETAIL_PRESENTATION`: dedurlo dal
   * dispositivo non funziona, perché la build web della mobile è `mobileweb` e ci finiva dentro il
   * ramo della webapp, aprendo il modale sopra la vista inline che il pannello monta comunque
   * (oc:8613).
   */
  async showPhoto(idx) {
    this._urlHandlerSvc.updateURL({gallery_index: idx});
    if (this._presentation === 'modal') {
      const modal = await this._modalCtrl.create({
        component: ModalImageComponent
      });
      modal.present();
    }
  }
}
