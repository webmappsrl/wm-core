import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {WmAddressComponent} from './address/address.component';
import {BoxModule} from './box/box.module';
import {WmElevationComponent} from './elevation/elevation.component';
import {WmEmailComponent} from './email/email.component';
import {WmFiltersModule} from './filters/filters.module';
import {WmHomeResultComponent} from './home/home-result/home-result.component';
import {WmHomeComponent} from './home/home.component';
import {WmHomeLayerComponent} from './home/home-layer/home-layer.component';
import {LangService} from './localization/lang.service';
import {WmLocalizationModule} from './localization/localization.module';
import {WmPhoneComponent} from './phone/phone.component';
import {WmPipeModule} from './pipes/pipe.module';
import {WmRelatedUrlsComponent} from './related-urls/related-urls.component';
import {WmSharedModule} from './shared/shared.module';
import {WmSlopeChartComponent} from './slope-chart/slope-chart.component';
import {ApiEffects} from './store/api/api.effects';
import {elasticQueryReducer} from './store/api/api.reducer';
import {ConfEffects} from './store/conf/conf.effects';
import {confReducer} from './store/conf/conf.reducer';
import {WmTabDescriptionComponent} from './tab-description/tab-description.component';
import {WmTabDetailComponent} from './tab-detail/tab-detail.component';
import {WmTabHowtoComponent} from './tab-howto/tab-howto.component';
import {WmTabNearestPoiComponent} from './tab-nearest-poi/tab-nearest-poi.component';
import {WmTrackAudioComponent} from './track-audio/track-audio.component';
import {WmTrackEdgesComponent} from './track-edges/track-edges.component';
import {WmInnerHtmlComponent} from './inner-html/inner-html.component';

export function httpTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
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
  WmHomeComponent,
  WmHomeResultComponent,
  WmHomeLayerComponent,
  WmTrackEdgesComponent,
  WmInnerHtmlComponent,
];
const modules = [WmSharedModule, WmPipeModule, BoxModule, WmLocalizationModule, WmFiltersModule];

@NgModule({
  declarations,
  imports: [
    ...[
      CommonModule,
      IonicModule,
      StoreModule.forFeature('query', elasticQueryReducer),
      StoreModule.forFeature('conf', confReducer),
      EffectsModule.forFeature([ApiEffects, ConfEffects]),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpTranslateLoader,
          deps: [HttpClient],
        },
      }),
    ],
    ...modules,
  ],
  providers: [LangService],
  exports: [...declarations, ...modules, TranslateModule],
})
export class WmCoreModule {}
