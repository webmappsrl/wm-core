import {BaseBoxComponent} from './base-box/base-box.component';
import {BoxComponent} from './box/box.component';
import {CardsModule} from '../cards/cards.module';
import {CommonModule} from '@angular/common';
import {DownloadedTracksBoxComponent} from './downloaded-tracks-box/downloaded-tracks-box.component';
import {ExternalUrlBoxComponent} from './external-url-box/external-url-box.component';
import {IonicModule} from '@ionic/angular';
import {LayerBoxComponent} from './layer-box/layer-box.component';
import {NgModule} from '@angular/core';
import {PipeModule} from 'src/app/shared/wm-core/pipes/pipe.module';
import {PoiBoxComponent} from './poi-box/poi-box.component';
import {SearchBoxComponent} from './search-box/search-box.component';
import {SharedModule} from '../../../components/shared/shared.module';
import {SliderBoxComponent} from './slider-box/slider-box.component';
import {TranslateModule} from '@ngx-translate/core';
import {WmSharedModule} from '../shared/shared.module';

const boxComponents = [
  LayerBoxComponent,
  SearchBoxComponent,
  ExternalUrlBoxComponent,
  DownloadedTracksBoxComponent,
  SliderBoxComponent,
  BaseBoxComponent,
  BoxComponent,
  PoiBoxComponent,
];
@NgModule({
  declarations: boxComponents,
  imports: [
    CommonModule,
    IonicModule,
    WmSharedModule,
    PipeModule,
    TranslateModule,
    SharedModule,
    CardsModule,
  ],
  exports: boxComponents,
})
export class BoxModule {}
