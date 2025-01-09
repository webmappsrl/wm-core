import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {NavController} from '@ionic/angular';

@Component({
  selector: 'wm-profile-records',
  templateUrl: './profile-records.component.html',
  styleUrls: ['./profile-records.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileRecordsComponent  {
  constructor(private _navCtrl: NavController) {}

  openPhotos() {
    this._navCtrl.navigateForward(['photolist']);
  }
}
