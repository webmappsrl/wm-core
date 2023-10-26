import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {LeftBarRoutingModule} from './left-bar-routing.module';
import {LeftBarComponent} from './left-bar.component';
import {IonicModule} from '@ionic/angular';

@NgModule({
  declarations: [LeftBarComponent],
  imports: [CommonModule, LeftBarRoutingModule, IonicModule],
  exports: [LeftBarComponent],
})
export class LeftBarModule {}
