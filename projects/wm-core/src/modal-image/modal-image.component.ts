import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
@Component({
  selector: 'wm-modal-image',
  templateUrl: './modal-image.component.html',
  styleUrls: ['./modal-image.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalImageComponent {
  constructor(private _modalCtrl: ModalController, private _urlHandlerSvc: UrlHandlerService) {}

  closeModal(): void {
    this._urlHandlerSvc.updateURL({gallery_index: null});
    this._modalCtrl.dismiss();
  }
}
