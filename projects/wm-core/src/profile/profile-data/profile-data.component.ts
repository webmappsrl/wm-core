import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'wm-profile-data',
  templateUrl: './profile-data.component.html',
  styleUrls: ['./profile-data.component.scss'],
})
export class ProfileDataComponent {

  constructor(
    private _navController: NavController
  ) { }

  open(section) {
    switch (section) {
      case 'tracks':
        this._navController.navigateForward(['downloadlist']);
        break;
      case 'data':
        // this._navController.navigateForward(['downloaddata']);
        break;

    }
  }
}
