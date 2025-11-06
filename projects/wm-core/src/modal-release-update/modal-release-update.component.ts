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
    console.log('[RELEASE UPDATE POPUP] openStore called with URL:', this.storeUrl);
    console.log('[RELEASE UPDATE POPUP] isIos:', this._deviceService.isIos);
    console.log('[RELEASE UPDATE POPUP] isAndroid:', this._deviceService.isAndroid);
    console.log('[RELEASE UPDATE POPUP] isBrowser:', this._deviceService.isBrowser);

    if (!this.storeUrl) {
      console.warn('[RELEASE UPDATE POPUP] storeUrl not available');
      this.close();
      return;
    }

    // On iOS simulator or browser, use window.open directly
    if (
      this._deviceService.isIos ||
      this._deviceService.isBrowser ||
      !this._deviceService.isMobile
    ) {
      console.log('[RELEASE UPDATE POPUP] Using window.open (iOS simulator/browser)');
      window.open(this.storeUrl, '_blank', 'noopener,noreferrer');
    } else {
      // On native device, try Browser.open
      try {
        console.log('[RELEASE UPDATE POPUP] Trying Browser.open on native platform');
        await Browser.open({url: this.storeUrl});
        console.log('[RELEASE UPDATE POPUP] Browser.open completed');
      } catch (error) {
        console.error(
          '[RELEASE UPDATE POPUP] Browser.open error, using window.open as fallback:',
          error,
        );
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
