import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'wm-profile-records',
  templateUrl: './profile-records.component.html',
  styleUrls: ['./profile-records.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileRecordsComponent  {
  constructor(private _navCtrl: NavController) {}

  open(section) {
    switch (section) {
      case 'tracks':
        this._navCtrl.navigateForward(['tracklist']);
        break;
      case 'photos':
        this._navCtrl.navigateForward(['photolist']);
        break;
      case 'waypoints':
        this._navCtrl.navigateForward(['waypointlist']);
        break;
      case 'vocals':
        this._navCtrl.navigateForward(['vocallist']);
        break;
    }
  }
}
