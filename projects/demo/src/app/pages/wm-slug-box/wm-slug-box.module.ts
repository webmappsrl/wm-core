import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmSlugBoxComponent} from './wm-slug-box.component';
import {WmSlugBoxRoutingModule} from './wm-slug-box-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [WmSlugBoxComponent],
  imports: [CommonModule, WmSlugBoxRoutingModule, WmCoreModule, SharedModule],
  exports: [WmSlugBoxComponent],
})
export class WmSlugBoxModule {}
