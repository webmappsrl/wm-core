import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {WmLocalizationModule} from '../localization/localization.module';
import {ProfileAuthComponent} from './profile-auth/profile-auth.component';
import {ProfileUserComponent} from './profile-user/profile-user.component';
import {ProfileDataComponent} from './profile-data/profile-data.component';
import {WmProfilePopupComponent} from './profile-popup/profile-popup.component';
const components = [
  ProfileAuthComponent,
  ProfileUserComponent,
  ProfileDataComponent,
  WmProfilePopupComponent,
];
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmPipeModule, WmLocalizationModule],
  exports: components,
})
export class WmProfileModule {}
