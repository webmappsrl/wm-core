import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {Browser} from '@capacitor/browser';
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
  @Input() productionVersion: string | null;

  constructor(private _modalController: ModalController, private _deviceService: DeviceService) {}

  ngOnInit() {}

  async openStore() {
    if (!this.storeUrl) {
      this.close();
      return;
    }

    // On iOS simulator or browser, use window.open directly
    if (
      this._deviceService.isIos ||
      this._deviceService.isBrowser ||
      !this._deviceService.isMobile
    ) {
      window.open(this.storeUrl, '_blank', 'noopener,noreferrer');
    } else {
      // On native device, try Browser.open
      try {
        await Browser.open({url: this.storeUrl});
      } catch (error) {
        window.open(this.storeUrl, '_blank', 'noopener,noreferrer');
      }
    }

    this.close();
  }

  close() {
    this._modalController.dismiss({
      dismissed: true,
    });
  }
}
