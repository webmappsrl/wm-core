import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmLayerBoxComponent} from './wm-layer-box.component';
import {WmLayerBoxRoutingModule} from './wm-layer-box-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [WmLayerBoxComponent],
  imports: [CommonModule, WmLayerBoxRoutingModule, WmCoreModule, SharedModule],
  exports: [WmLayerBoxComponent],
})
export class WmLayerBoxModule {}
