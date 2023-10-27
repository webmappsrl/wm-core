import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DemoTabHowtoComponent} from './demo-tab-howto.component';
import {DemoTabHowtoRoutingModule} from './demo-tab-howto-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [DemoTabHowtoComponent],
  imports: [CommonModule, DemoTabHowtoRoutingModule, WmCoreModule, SharedModule],
  exports: [DemoTabHowtoComponent],
})
export class DemoTabHowtoModule {}
