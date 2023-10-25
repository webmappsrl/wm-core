import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {WmStatusFilterComponent} from './wm-status-filter.component';
import {WmStatusFilterRoutingModule} from './wm-status-filter-routing.module';

@NgModule({
  declarations: [WmStatusFilterComponent],
  imports: [CommonModule, WmStatusFilterRoutingModule, WmCoreModule],
  exports: [WmStatusFilterComponent],
})
export class WmStatusFilterModule {}
