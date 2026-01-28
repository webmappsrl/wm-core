import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {WmLangSelectorComponent} from './lang-selector/lang-selector.component';
import {WmOnLangChangeDirective} from './wm-on-lang-change.directive';
import {WmPipeModule} from './../pipes/pipe.module';

const components = [WmLangSelectorComponent, WmOnLangChangeDirective];

@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, WmPipeModule],
  exports: [...components],
})
export class WmLocalizationModule {}
