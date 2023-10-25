import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WmHorizontalScrollBoxComponent} from './wm-horizontal-scroll-box.component';

const routes: Routes = [
  {
    path: '',
    component: WmHorizontalScrollBoxComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WmHorizontalScrollBoxRoutingModule {}
