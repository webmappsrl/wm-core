import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WmSearchBoxComponent} from './wm-search-box.component';

const routes: Routes = [
  {
    path: '',
    component: WmSearchBoxComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WmSearchBoxRoutingModule {}
