import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UpdateService} from '@wm-core/services/update.service';

@Component({
  standalone: false,
  selector: 'wm-modal-release-update-app',
  templateUrl: './modal-release-update.component.html',
  styleUrls: ['./modal-release-update.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalReleaseUpdateComponent implements OnInit {
  @Input() storeUrl: string | null = null;
  @Input() gitVersion: string | null;
  @Input() mandatory: boolean = false;
  @Input() releaseNotes: string | null = null;

  constructor(private _modalController: ModalController, private _updateService: UpdateService) {}

  ngOnInit() {}

  async openStore() {
    await this._updateService.openStoreUrl(this.storeUrl);
    this.close();
  }

  close() {
    if (this.mandatory) {
      // In caso di aggiornamento obbligatorio il modal non deve essere chiudibile manualmente
      return;
    }
    this._modalController.dismiss({
      dismissed: true,
    });
  }
}
