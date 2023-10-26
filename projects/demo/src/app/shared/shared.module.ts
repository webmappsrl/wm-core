import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DemoFigmaComponent} from './demo-figma/demo-figma.component';
import {IonicModule} from '@ionic/angular';
const declarations = [DemoFigmaComponent];

@NgModule({
  declarations,
  imports: [CommonModule, IonicModule],
  exports: declarations,
})
export class SharedModule {}
