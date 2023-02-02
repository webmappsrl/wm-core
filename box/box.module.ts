import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {WmSharedModule} from '../shared/shared.module';
import {BaseBoxComponent} from './base-box/base-box.component';
import {ExternalUrlBoxComponent} from './external-url-box/external-url-box.component';
import {LayerBoxComponent} from './layer-box/layer-box.component';
import {PoiBoxComponent} from './poi-box/poi-box.component';
import {PoiTypeFilterBoxComponent} from './poi-type-filter-box/poi-type-filter-box.component';
import {SearchBoxComponent} from './search-box/search-box.component';
import {SliderBoxComponent} from './slider-box/slider-box.component';
import {SlugBoxComponent} from './slug-box/slug-box.component';
import {TrackBoxComponent} from './track-box/track-box.component';

const boxComponents = [
  LayerBoxComponent,
  SearchBoxComponent,
  ExternalUrlBoxComponent,
  SliderBoxComponent,
  BaseBoxComponent,
  SlugBoxComponent,
  PoiBoxComponent,
  TrackBoxComponent,
  PoiTypeFilterBoxComponent,
];
@NgModule({
  declarations: boxComponents,
  imports: [CommonModule, IonicModule, WmSharedModule, WmPipeModule],
  exports: boxComponents,
})
export class BoxModule {}
