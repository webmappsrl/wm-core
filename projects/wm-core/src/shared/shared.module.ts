import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';
import {WmImgComponent} from './img/img.component';

const declarations = [WmImgComponent];

@NgModule({
  declarations,
  imports: [CommonModule, IonicModule],
  exports: [...declarations],
})
export class WmSharedModule {}
