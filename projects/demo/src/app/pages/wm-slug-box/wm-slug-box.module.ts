import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmSlugBoxComponent} from './wm-slug-box.component';
import {WmSlugBoxRoutingModule} from './wm-slug-box-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';

@NgModule({
  declarations: [WmSlugBoxComponent],
  imports: [CommonModule, WmSlugBoxRoutingModule, WmCoreModule],
  exports: [WmSlugBoxComponent],
})
export class WmSlugBoxModule {}
