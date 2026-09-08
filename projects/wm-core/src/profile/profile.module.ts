import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {ReactiveFormsModule} from '@angular/forms';
import {WmPipeModule} from '../pipes/pipe.module';
import {ProfileAuthComponent} from './profile-auth/profile-auth.component';
import {ProfileUserComponent} from './profile-user/profile-user.component';
import {ProfileDataComponent} from './profile-data/profile-data.component';
import {WmProfilePopupComponent} from './profile-popup/profile-popup.component';
import {ProfileEditComponent} from './profile-edit/profile-edit.component';
import {WmSharedModule} from '../shared/shared.module';
const components = [
  ProfileAuthComponent,
  ProfileUserComponent,
  ProfileDataComponent,
  WmProfilePopupComponent,
  ProfileEditComponent,
];
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmPipeModule, WmSharedModule, ReactiveFormsModule],
  exports: components,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WmProfileModule {}
