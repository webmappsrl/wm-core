import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';

import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';

import {WmSlopeChartComponent} from './slope-chart/slope-chart.component';

import {WmAddressComponent} from './address/address.component';
import {ApiEffects} from './api/api.effects';
import {elasticQueryReducer} from './api/api.reducer';
import {BoxModule} from './box/box.module';
import {WmDownloadPanelComponent} from './download-panel/download-panel.component';
import {WmDownloadComponent} from './download/download/download.component';
import {WmEmailComponent} from './email/email.component';
import {WmPhoneComponent} from './phone/phone.component';
import {WmRelatedUrlsComponent} from './related-urls/related-urls.component';
import {WmTabDescriptionComponent} from './tab-description/tab-description.component';
import {WmTabDetailComponent} from './tab-detail/tab-detail.component';
import {WmTabHowtoComponent} from './tab-howto/tab-howto.component';
import {WmTabNearestPoiComponent} from './tab-nearest-poi/tab-nearest-poi.component';
import {WmTrackAudioComponent} from './track-audio/track-audio.component';
import {PipeModule} from './pipes/pipe.module';
import {CardsModule} from './cards/cards.module';
import {WmSharedModule} from './shared/shared.module';

const declarations = [
  WmAddressComponent,
  WmDownloadComponent,
  WmDownloadPanelComponent,
  WmTabDetailComponent,
  WmTabDescriptionComponent,
  WmTabHowtoComponent,
  WmTabNearestPoiComponent,
  WmTrackAudioComponent,
  WmSlopeChartComponent,
  WmRelatedUrlsComponent,
  WmEmailComponent,
  WmPhoneComponent,
];
const modules = [WmSharedModule, BoxModule, PipeModule, CardsModule];

@NgModule({
  declarations,
  imports: [
    ...[
      CommonModule,
      IonicModule,
      StoreModule.forFeature('query', elasticQueryReducer),
      EffectsModule.forFeature([ApiEffects]),
    ],
    ...modules,
  ],
  exports: [...declarations, ...modules],
})
export class WmCoreModule {}
