import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {IonModal, IonSlides, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {ModalImageComponent} from '@wm-core/modal-image/modal-image.component';
import {confIsMobile} from '@wm-core/store/conf/conf.selector';
import {BehaviorSubject, Observable} from 'rxjs';

@Component({
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
        slidesPerView: 1.3,
        centeredSlides: true,
        spaceBetween: 10,
      });
    }
    this.imageGallery$.next(imgGallery);
  }

  @ViewChild(IonModal) modal: IonModal;
  @ViewChild('slider') slider: IonSlides;

  imageGallery$: BehaviorSubject<null | any[]> = new BehaviorSubject<null | any[]>(null);
  isMobile$: Observable<boolean> = this._store.select(confIsMobile);
  sliderOptions$: BehaviorSubject<any> = new BehaviorSubject<any>({
    slidesPerView: 1.3,
    centeredSlides: true,
    spaceBetween: 10,
  });

  constructor(private _modalCtrl: ModalController, private _store: Store) {}

  next(): void {
    this.slider.slideNext();
  }

  prev(): void {
    this.slider.slidePrev();
  }

  async showPhoto(idx) {
    const modal = await this._modalCtrl.create({
      component: ModalImageComponent,
      componentProps: {idx, imageGallery: this.imageGallery$.value},
    });
    modal.present();
  }
}
