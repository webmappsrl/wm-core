import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {WmLocalizationModule} from '../localization/localization.module';
import {ProfileAuthComponent} from './profile-auth/profile-auth.component';
import {ProfileUserComponent} from './profile-user/profile-user.component';
import {ProfileDataComponent} from './profile-data/profile-data.component';
import {WmProfilePopupComponent} from './profile-popup/profile-popup.component';
import {WmSharedModule} from '../shared/shared.module';
const components = [
  ProfileAuthComponent,
  ProfileUserComponent,
  ProfileDataComponent,
  WmProfilePopupComponent,
];
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmPipeModule, WmSharedModule, WmLocalizationModule],
  exports: components,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WmProfileModule {}
