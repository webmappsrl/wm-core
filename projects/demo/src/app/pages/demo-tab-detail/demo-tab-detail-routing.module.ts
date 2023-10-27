import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DemoTabDetailComponent} from './demo-tab-detail.component';

const routes: Routes = [
  {
    path: '',
    component: DemoTabDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DemoTabDetailRoutingModule {}
