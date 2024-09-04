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
  constructor(private _navController: NavController) {}

  open(section) {
    switch (section) {
      case 'tracks':
        this._navController.navigateForward(['tracklist']);
        break;
      case 'photos':
        this._navController.navigateForward(['photolist']);
        break;
      case 'waypoints':
        this._navController.navigateForward(['waypointlist']);
        break;
      case 'vocals':
        this._navController.navigateForward(['vocallist']);
        break;
    }
  }
}
