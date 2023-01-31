import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';

import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';

import {WmSlopeChartComponent} from './slope-chart/slope-chart.component';

import {WmAddressComponent} from './address/address.component';
import {ApiEffects} from './api/api.effects';
import {elasticQueryReducer} from './api/api.reducer';
import {WmEmailComponent} from './email/email.component';
import {WmPhoneComponent} from './phone/phone.component';
import {WmRelatedUrlsComponent} from './related-urls/related-urls.component';
import {WmTabDescriptionComponent} from './tab-description/tab-description.component';
import {WmTabDetailComponent} from './tab-detail/tab-detail.component';
import {WmTabHowtoComponent} from './tab-howto/tab-howto.component';
import {WmTabNearestPoiComponent} from './tab-nearest-poi/tab-nearest-poi.component';
import {WmTrackAudioComponent} from './track-audio/track-audio.component';
import {WmPipeModule} from './pipes/pipe.module';
import {WmSharedModule} from './shared/shared.module';
import {BoxModule} from './box/box.module';
import {WmElevationComponent} from './elevation/elevation.component';

const declarations = [
  WmAddressComponent,
  WmTabDetailComponent,
  WmTabDescriptionComponent,
  WmTabHowtoComponent,
  WmTabNearestPoiComponent,
  WmTrackAudioComponent,
  WmSlopeChartComponent,
  WmRelatedUrlsComponent,
  WmEmailComponent,
  WmPhoneComponent,
  WmElevationComponent,
];
const modules = [WmSharedModule, WmPipeModule, BoxModule];

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
