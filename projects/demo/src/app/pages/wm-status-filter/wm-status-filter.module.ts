import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {WmStatusFilterComponent} from './wm-status-filter.component';
import {WmStatusFilterRoutingModule} from './wm-status-filter-routing.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [WmStatusFilterComponent],
  imports: [CommonModule, WmStatusFilterRoutingModule, WmCoreModule, SharedModule],
  exports: [WmStatusFilterComponent],
})
export class WmStatusFilterModule {}
