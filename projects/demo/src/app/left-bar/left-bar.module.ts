import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {LeftBarRoutingModule} from './left-bar-routing.module';
import {LeftBarComponent} from './left-bar.component';

@NgModule({
  declarations: [LeftBarComponent],
  imports: [CommonModule, LeftBarRoutingModule],
  exports: [LeftBarComponent],
})
export class LeftBarModule {}
