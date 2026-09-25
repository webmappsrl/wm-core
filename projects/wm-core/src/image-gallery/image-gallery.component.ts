import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
import {DeviceService} from '@wm-core/services/device.service';
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
    private _deviceSvc: DeviceService
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
   * La condizione è su `isAppMobile` e non su `isMobile` (oc:8406): `isMobile` guarda lo user
   * agent (`Platform.is('android'|'ios')`), quindi era vera anche per la webapp aperta da
   * telefono o tablet — che però non monta la vista inline, essendo quella del pannello
   * dell'app. Il risultato era che lì il tap su una foto non apriva nulla e cambiava solo l'URL.
   * `isAppMobile` è `isMobile && !isBrowser`, cioè "dentro l'app nativa": il modale si apre ora
   * su qualunque browser, desktop o mobile, e l'app nativa conserva la vista inline.
   */
  async showPhoto(idx) {
    this._urlHandlerSvc.updateURL({gallery_index: idx});
    if (!this._deviceSvc.isAppMobile) {
      const modal = await this._modalCtrl.create({
        component: ModalImageComponent
      });
      modal.present();
    }
  }
}
