import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WmLayerBoxComponent} from './wm-layer-box.component';

const routes: Routes = [
  {
    path: '',
    component: WmLayerBoxComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WmLayerBoxRoutingModule {}
