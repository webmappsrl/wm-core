import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';
import {WmImgComponent} from './img/img.component';
import {UgcSynchronizedBadgeComponent} from './ugc-synchronized-badge/ugc-synchronized-badge.component';

const declarations = [WmImgComponent, UgcSynchronizedBadgeComponent];

@NgModule({
  declarations,
  imports: [CommonModule, IonicModule],
  exports: [...declarations],
})
export class WmSharedModule {}
