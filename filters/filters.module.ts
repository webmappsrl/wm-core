import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FiltersComponent} from './filters.component';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {SelectFilterComponent} from './select-filter/select-filter.component';
import {StatusFilterComponent} from './status-filter/status-filter.component';
import {SliderFilterComponent} from './slider-filter/slider-filter.component';
import {SliderFilterMeasurePipe} from './slider-filter/slider-filter-measure.pipe';
const components = [
  FiltersComponent,
  SelectFilterComponent,
  StatusFilterComponent,
  SliderFilterComponent,
  SliderFilterMeasurePipe,
];
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmPipeModule],
  exports: components,
})
export class WmFiltersModule {}
