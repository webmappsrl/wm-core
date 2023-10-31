import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DemoTabImageGalleryComponent} from './demo-tab-image-gallery.component';

const routes: Routes = [
  {
    path: '',
    component: DemoTabImageGalleryComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DemoTabImageGalleryRoutingModule {}
