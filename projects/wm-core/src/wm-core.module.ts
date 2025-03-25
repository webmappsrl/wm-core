import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {EffectsModule} from '@ngrx/effects';
import {Store, StoreModule} from '@ngrx/store';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {BoxModule} from './box/box.module';
import {WmEmailComponent} from './email/email.component';
import {WmFiltersModule} from './filters/filters.module';
import {WmHomeResultComponent} from './home/home-result/home-result.component';
import {WmHomeLandingComponent} from './home/home-landing/home-landing.component';
import {WmHomeLayerComponent} from './home/home-layer/home-layer.component';
import {WmHomeComponent} from './home/home.component';
import {LangService} from './localization/lang.service';
import {WmLocalizationModule} from './localization/localization.module';
import {WmPhoneComponent} from './phone/phone.component';
import {WmPipeModule} from './pipes/pipe.module';
import {WmRelatedUrlsComponent} from './related-urls/related-urls.component';
import {WmSharedModule} from './shared/shared.module';
import {WmSlopeChartComponent} from './slope-chart/slope-chart.component';
import {EcEffects} from './store/features/ec/ec.effects';
import {ecReducer} from './store/features/ec/ec.reducer';
import {ConfEffects} from './store/conf/conf.effects';
import {confReducer} from './store/conf/conf.reducer';
import {WmTabDescriptionComponent} from './tab-description/tab-description.component';
import {WmTabDetailComponent} from './tab-detail/tab-detail.component';
import {WmTabHowtoComponent} from './tab-howto/tab-howto.component';
import {WmTabNearestPoiComponent} from './tab-nearest-poi/tab-nearest-poi.component';
import {WmTrackAudioComponent} from './track-audio/track-audio.component';
import {WmTrackEdgesComponent} from './track-edges/track-edges.component';
import {WmInnerHtmlComponent} from './inner-html/inner-html.component';
import {ButtonsModule} from './buttons/export-to/buttons.module';
import {WmFeatureUsefulUrlsComponent} from './feature-useful-urls/feature-useful-urls.component';
import {AuthInterceptor} from './store/auth/auth.interceptor';
import {AuthEffects} from './store/auth/auth.effects';
import {authReducer} from './store/auth/auth.reducer';
import {ModalHeaderComponent} from './modal-header/modal-header.component';
import {LoginComponent} from './login/login.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {WmProfileModule} from './profile/profile.module';
import {RegisterComponent} from './register/register.component';
import {GenericPopoverComponent} from './generic-popover/generic-popover.component';
import {WmHomeUgcComponent} from './home/home-ugc/home-ugc.component';
import {WmFormComponent} from './form/form.component';
import {UgcEffects} from './store/features/ugc/ugc.effects';
import {UgcReducer} from './store/features/ugc/ugc.reducer';
import {userActivityReducer} from './store/user-activity/user-activity.reducer';
import {UserActivityEffects} from './store/user-activity/user-activity.effects';
import {WmSearchBarComponent} from './search-bar/search-bar.component';
import {WmGeoboxMapComponent} from './geobox-map/geobox-map.component';
import {WmMapModule} from '@map-core/map-core.module';
import {UrlHandlerService} from './services/url-handler.service';
import {WmUgcMediasModule} from './ugc-medias/wm-ugc-medias.module';
import {UgcTrackDataComponent} from './ugc-details/ugc-track-data/ugc-track-data.component';
import {UgcTrackPropertiesComponent} from './ugc-track-properties/ugc-track-properties.component';
import {TrackPropertiesComponent} from './track-properties/track-properties.component';
import {TabImageGalleryComponent} from './tab-image-gallery/tab-image-gallery.component';
import {ModalImageComponent} from './modal-image/modal-image.component';
import {ImageGalleryComponent} from './image-gallery/image-gallery.component';
import {TrackRelatedPoiComponent} from './track-related-poi/track-related-poi.component';
import {UgcPoiPropertiesComponent} from './ugc-poi-properties/ugc-poi-properties.component';
import {WmTrackAlertComponent} from './track-alert/track-alert.component';
import {ModalUgcTrackUploaderComponent} from './modal-ugc-track-uploader/modal-ugc-track-uploader.component';
import {NetworkEffects} from './store/network/network.effects';
import {networkReducer} from './store/network/netwotk.reducer';
import {WmHomeHitMapComponent} from './home/home-hitmap/home-hitmap.component';
import {MetaComponent} from './meta/meta.component';
import {GetDirectionsComponent} from './get-directions/get-directions.component';
import {TravelModeComponent} from './travel-mode/travel-mode.component';
export const declarations = [
  WmTabDetailComponent,
  WmTabDescriptionComponent,
  WmTabHowtoComponent,
  WmTabNearestPoiComponent,
  WmTrackAudioComponent,
  WmSlopeChartComponent,
  WmRelatedUrlsComponent,
  WmEmailComponent,
  WmPhoneComponent,
  WmHomeComponent,
  WmHomeLandingComponent,
  WmHomeResultComponent,
  WmHomeLayerComponent,
  WmHomeUgcComponent,
  WmTrackEdgesComponent,
  WmInnerHtmlComponent,
  WmFeatureUsefulUrlsComponent,
  LoginComponent,
  RegisterComponent,
  GenericPopoverComponent,
  ModalHeaderComponent,
  WmFormComponent,
  WmSearchBarComponent,
  WmGeoboxMapComponent,
  UgcTrackPropertiesComponent,
  UgcTrackDataComponent,
  TrackPropertiesComponent,
  ModalImageComponent,
  TabImageGalleryComponent,
  ImageGalleryComponent,
  TrackRelatedPoiComponent,
  UgcPoiPropertiesComponent,
  WmTrackAlertComponent,
  ModalUgcTrackUploaderComponent,
  WmHomeHitMapComponent,
  MetaComponent,
  GetDirectionsComponent,
  TravelModeComponent,
];
const modules = [
  WmSharedModule,
  WmPipeModule,
  BoxModule,
  ButtonsModule,
  WmLocalizationModule,
  WmFiltersModule,
  ReactiveFormsModule,
  WmProfileModule,
  WmMapModule,
  WmUgcMediasModule,
  FormsModule,
];
@NgModule({
  declarations,
  imports: [
    ...[
      CommonModule,
      IonicModule,
      StoreModule.forFeature('ec', ecReducer),
      StoreModule.forFeature('conf', confReducer),
      StoreModule.forFeature('auth', authReducer),
      StoreModule.forFeature('ugc', UgcReducer),
      StoreModule.forFeature('user-activity', userActivityReducer),
      StoreModule.forFeature('network', networkReducer),
      EffectsModule.forFeature([
        EcEffects,
        ConfEffects,
        AuthEffects,
        UgcEffects,
        UserActivityEffects,
        NetworkEffects,
      ]),
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
  providers: [{provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true}],
  exports: [...declarations, ...modules, TranslateModule],
})
export class WmCoreModule {}

export function httpTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function initializeUrlHandler(urlHandlerService: UrlHandlerService) {
  return () => urlHandlerService.initialize();
}
