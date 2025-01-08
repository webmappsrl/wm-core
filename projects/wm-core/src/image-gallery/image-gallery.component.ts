import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {IonModal, ModalController} from '@ionic/angular';
import {ModalImageComponent} from '@wm-core/modal-image/modal-image.component';
import {BehaviorSubject} from 'rxjs';

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
      });
    }
    this.imageGallery$.next(imgGallery);
  }

  @ViewChild(IonModal) modal: IonModal;

  imageGallery$: BehaviorSubject<null | any[]> = new BehaviorSubject<null | any[]>(null);
  sliderOptions$: BehaviorSubject<any> = new BehaviorSubject<any>({
    slidesPerView: 1.3,
  });

  constructor(private _modalCtrl: ModalController) {}

  async showPhoto(idx) {
    const modal = await this._modalCtrl.create({
      component: ModalImageComponent,
      componentProps: {idx, imageGallery: this.imageGallery$.value},
    });
    modal.present();
  }
}
