import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WebmappTitleComponent} from './webmapp-title.component';
import {WebmappTitleRoutingModule} from './webmapp-title-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [WebmappTitleComponent],
  imports: [CommonModule, WebmappTitleRoutingModule, WmCoreModule, SharedModule],
  exports: [WebmappTitleComponent],
})
export class WebmappTitleModule {}
