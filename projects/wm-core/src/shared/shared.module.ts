import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';
import {WmImgComponent} from './img/img.component';
import {UgcSynchronizedBadgeComponent} from './ugc-synchronized-badge/ugc-synchronized-badge.component';
import {WmIconComponent} from '../wm-icon/wm-icon.component';
import {WmPipeModule} from '../pipes/pipe.module';

const declarations = [WmImgComponent, UgcSynchronizedBadgeComponent, WmIconComponent];

@NgModule({
  declarations,
  imports: [CommonModule, IonicModule, WmPipeModule],
  exports: [...declarations],
})
export class WmSharedModule {}
