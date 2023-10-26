import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {WmPoiBoxComponent} from './wm-poi-box.component';
import {WmPoihBoxRoutingModule} from './wm-poi-box-routing.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [WmPoiBoxComponent],
  imports: [CommonModule, WmPoihBoxRoutingModule, WmCoreModule, SharedModule],
  exports: [WmPoiBoxComponent],
})
export class WmPoiBoxModule {}
