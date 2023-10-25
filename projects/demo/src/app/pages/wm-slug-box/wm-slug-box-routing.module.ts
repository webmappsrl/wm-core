import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WmSlugBoxComponent} from './wm-slug-box.component';

const routes: Routes = [
  {
    path: '',
    component: WmSlugBoxComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WmSlugBoxRoutingModule {}
