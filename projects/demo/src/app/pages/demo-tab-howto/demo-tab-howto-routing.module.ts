import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DemoTabHowtoComponent} from './demo-tab-howto.component';

const routes: Routes = [
  {
    path: '',
    component: DemoTabHowtoComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DemoTabHowtoRoutingModule {}
