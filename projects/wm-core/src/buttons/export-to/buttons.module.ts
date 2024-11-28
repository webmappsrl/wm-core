import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {IonicModule} from '@ionic/angular';

import {ExportToBtnComponent} from './export-to.component';
import {WmSharedModule} from '@wm-core/shared/shared.module';
import {WmPipeModule} from '@wm-core/pipes/pipe.module';

const buttonsComponents = [ExportToBtnComponent];
@NgModule({
  declarations: buttonsComponents,
  imports: [CommonModule, IonicModule, WmSharedModule, WmPipeModule],
  exports: buttonsComponents,
})
export class ButtonsModule {}
