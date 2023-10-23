import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {WmLangSelectorComponent} from './lang-selector/lang-selector.component';
import {WmPipeModule} from './../pipes/pipe.module';

const components = [WmLangSelectorComponent];

@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, WmPipeModule],
  exports: [...components],
})
export class WmLocalizationModule {}
