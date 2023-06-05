import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FiltersComponent} from './filters.component';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {SelectFilterComponent} from './select-filter/select-filter.component';
const components = [FiltersComponent, SelectFilterComponent];
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmPipeModule],
  exports: components,
})
export class WmFiltersModule {}
