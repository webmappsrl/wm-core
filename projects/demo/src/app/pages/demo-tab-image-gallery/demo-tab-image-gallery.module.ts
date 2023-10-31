import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DemoTabImageGalleryComponent} from './demo-tab-image-gallery.component';
import {DemoTabImageGalleryRoutingModule} from './demo-tab-image-gallery-routing.module';
import {WmCoreModule} from 'wm-core/wm-core.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  declarations: [DemoTabImageGalleryComponent],
  imports: [CommonModule, DemoTabImageGalleryRoutingModule, WmCoreModule, SharedModule],
  exports: [DemoTabImageGalleryComponent],
})
export class DemoTabImageGalleryModule {}
