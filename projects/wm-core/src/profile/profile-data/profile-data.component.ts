import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  standalone: false,
  selector: 'wm-profile-data',
  templateUrl: './profile-data.component.html',
  styleUrls: ['./profile-data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileDataComponent {
  constructor(
    private _navCtrl: NavController
  ) { }

  open(section) {
    switch (section) {
      case 'tracks':
        this._navCtrl.navigateForward(['downloadlist']);
        break;
      case 'data':
        // this._navCtrl.navigateForward(['downloaddata']);
        break;
    }
  }
}
