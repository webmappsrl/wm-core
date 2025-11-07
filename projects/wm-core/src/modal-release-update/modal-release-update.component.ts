import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {DeviceService} from '@wm-core/services/device.service';

@Component({
  selector: 'wm-modal-release-update-app',
  templateUrl: './modal-release-update.component.html',
  styleUrls: ['./modal-release-update.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalReleaseUpdateComponent implements OnInit {
  @Input() storeUrl: string;
  @Input() gitVersion: string | null;

  constructor(private _modalController: ModalController, private _deviceService: DeviceService) {}

  ngOnInit() {}

  async openStore() {
    if (!this.storeUrl) {
      this.close();
      return;
    }

    await this._deviceService.openStoreUrl(this.storeUrl);
    this.close();
  }

  close() {
    this._modalController.dismiss({
      dismissed: true,
    });
  }
}
