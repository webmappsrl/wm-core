import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {WmUgcMediasComponent} from './wm-ugc-medias.component';
import {WmSharedModule} from '@wm-core/shared/shared.module';
import {WmModalMediaComponent} from './modal-media/wm-modal-media.component';
const components = [WmUgcMediasComponent, WmModalMediaComponent];
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmSharedModule, WmPipeModule],
  exports: components,
})
export class WmUgcMediasModule {}
