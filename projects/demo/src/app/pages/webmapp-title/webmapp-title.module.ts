import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WebmappTitleComponent} from './webmapp-title.component';
import {WebmappTitleRoutingModule} from './webmapp-title-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';

@NgModule({
  declarations: [WebmappTitleComponent],
  imports: [CommonModule, WebmappTitleRoutingModule, WmCoreModule],
  exports: [WebmappTitleComponent],
})
export class WebmappTitleModule {}
