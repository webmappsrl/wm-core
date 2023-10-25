import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WmPoiBoxComponent} from './wm-poi-box.component';

const routes: Routes = [
  {
    path: '',
    component: WmPoiBoxComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WmPoihBoxRoutingModule {}
