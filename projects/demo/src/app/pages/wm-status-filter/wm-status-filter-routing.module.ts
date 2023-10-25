import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WmStatusFilterComponent} from './wm-status-filter.component';

const routes: Routes = [
  {
    path: '',
    component: WmStatusFilterComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WmStatusFilterRoutingModule {}
