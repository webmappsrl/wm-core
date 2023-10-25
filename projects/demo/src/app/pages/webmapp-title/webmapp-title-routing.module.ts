import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WebmappTitleComponent} from './webmapp-title.component';

const routes: Routes = [
  {
    path: '',
    component: WebmappTitleComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WebmappTitleRoutingModule {}
