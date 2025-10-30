import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';
import {WmImgComponent} from './img/img.component';
import {UgcSynchronizedBadgeComponent} from './ugc-synchronized-badge/ugc-synchronized-badge.component';
import {WmIconComponent} from '../wm-icon/wm-icon.component';
import {WmPipeModule} from '../pipes/pipe.module';
import {WmPrivacyAgreeButtonComponent} from './privacy-agree-button/privacy-agree-button.component';
import {WmProfileDeleteButtonComponent} from './profile-delete-button/profile-delete-button.component';

const declarations = [
  WmImgComponent,
  UgcSynchronizedBadgeComponent,
  WmIconComponent,
  WmPrivacyAgreeButtonComponent,
  WmProfileDeleteButtonComponent,
];

@NgModule({
  declarations,
  imports: [CommonModule, IonicModule, WmPipeModule],
  exports: [...declarations],
})
export class WmSharedModule {}
