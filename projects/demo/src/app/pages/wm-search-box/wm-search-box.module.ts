import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {WmSearchBoxComponent} from './wm-search-box.component';
import {WmSearchBoxRoutingModule} from './wm-search-box-routing.module';

@NgModule({
  declarations: [WmSearchBoxComponent],
  imports: [CommonModule, WmSearchBoxRoutingModule, WmCoreModule],
  exports: [WmSearchBoxComponent],
})
export class WmSearchBoxModule {}
