import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';
import {WmImgComponent} from './img/img.component';
import {UgcSynchronizedComponent} from './ugc-synchronized/ugc-synchronized.component';

const declarations = [WmImgComponent, UgcSynchronizedComponent];

@NgModule({
  declarations,
  imports: [CommonModule, IonicModule],
  exports: [...declarations],
})
export class WmSharedModule {}
