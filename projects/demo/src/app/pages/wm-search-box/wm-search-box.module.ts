import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {WmSearchBoxComponent} from './wm-search-box.component';
import {WmSearchBoxRoutingModule} from './wm-search-box-routing.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [WmSearchBoxComponent],
  imports: [CommonModule, WmSearchBoxRoutingModule, WmCoreModule, SharedModule],
  exports: [WmSearchBoxComponent],
})
export class WmSearchBoxModule {}
