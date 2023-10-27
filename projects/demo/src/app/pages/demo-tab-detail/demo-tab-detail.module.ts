import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DemoTabDetailComponent} from './demo-tab-detail.component';
import {DemoTabDetailRoutingModule} from './demo-tab-detail-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [DemoTabDetailComponent],
  imports: [CommonModule, DemoTabDetailRoutingModule, WmCoreModule, SharedModule],
  exports: [DemoTabDetailComponent],
})
export class DemoTabDetailModule {}
