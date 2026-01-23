import {CommonModule} from '@angular/common';
import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {WmPipeModule} from '../pipes/pipe.module';
import {WmSharedModule} from '../shared/shared.module';
import {BaseBoxComponent} from './base-box/base-box.component';
import {BoxComponent} from './box/box.component';
import {ExternalUrlBoxComponent} from './external-url-box/external-url-box.component';
import {ConvertToHorizontalScrollBoxItemsPipe} from './horizontal-scroll-box/convert-to-horizontal-scroll-box.pipe';
import {HorizontalScrollBoxComponent} from './horizontal-scroll-box/horizontal-scroll-box.component';
import {LayerBoxComponent} from './layer-box/layer-box.component';
import {PoiBoxComponent} from './poi-box/poi-box.component';
import {PoiTypeFilterBoxComponent} from './poi-type-filter-box/poi-type-filter-box.component';
import {SearchBoxComponent} from './search-box/search-box.component';
import {SliderBoxComponent} from './slider-box/slider-box.component';
import {SlugBoxComponent} from './slug-box/slug-box.component';
import {TitleComponent} from './title/title.component';
import {TrackBoxComponent} from './track-box/track-box.component';
import {FeaturesBoxComponent} from './features-box/features-box.component';
import {UgcBoxComponent} from './ugc-box/ugc-box.component';
import {UpdatedAtComponent} from './udpated-at/updated-at.component';
import {DownloadsEcTrackBox} from './downloads-ec-track-box /downloads-ec-track-box.component';
import {WmLayerFeaturesCounterBadgeComponent} from '@wm-core/layer-features-counter-badge/layer-features-counter-badge.component';

const boxComponents = [
  LayerBoxComponent,
  SearchBoxComponent,
  ExternalUrlBoxComponent,
  SliderBoxComponent,
  BaseBoxComponent,
  SlugBoxComponent,
  PoiBoxComponent,
  TrackBoxComponent,
  UgcBoxComponent,
  PoiTypeFilterBoxComponent,
  HorizontalScrollBoxComponent,
  ConvertToHorizontalScrollBoxItemsPipe,
  TitleComponent,
  BoxComponent,
  FeaturesBoxComponent,
  UpdatedAtComponent,
  DownloadsEcTrackBox,
  WmLayerFeaturesCounterBadgeComponent,
];
@NgModule({
  declarations: boxComponents,
  imports: [CommonModule, IonicModule, WmSharedModule, WmPipeModule],
  exports: boxComponents,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BoxModule {}
