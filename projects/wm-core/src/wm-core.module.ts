import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {APP_INITIALIZER, NgModule} from '@angular/core';
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
import {WmExcerptComponent} from './excerpt/excerpt.component';
import {WmTrackDownloadUrlsComponent} from './track-download-urls/track-download-urls.component';
import {AuthInterceptor} from './store/auth/auth.interceptor';
import {AuthEffects} from './store/auth/auth.effects';
import {authReducer} from './store/auth/auth.reducer';
import {ModalHeaderComponent} from './modal-header/modal-header.component';
import {LoginComponent} from './login/login.component';
import {ReactiveFormsModule} from '@angular/forms';
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
import {UgcDetailsComponent} from './ugc-details/ugc-details.component';
import { TrackPropertiesComponent } from './track-properties/track-properties.component';
import { TabImageGalleryComponent } from './tab-image-gallery/tab-image-gallery.component';
import { ModalImageComponent } from './modal-image/modal-image.component';
import { ImageGalleryComponent } from './image-gallery/image-gallery.component';
import { TrackRelatedPoiComponent } from './track-related-poi/track-related-poi.component';
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
  WmHomeLandingComponent,
  WmHomeResultComponent,
  WmHomeLayerComponent,
  WmHomeUgcComponent,
  WmTrackEdgesComponent,
  WmInnerHtmlComponent,
  WmTrackDownloadUrlsComponent,
  LoginComponent,
  RegisterComponent,
  GenericPopoverComponent,
  ModalHeaderComponent,
  WmExcerptComponent,
  WmFormComponent,
  WmSearchBarComponent,
  WmGeoboxMapComponent,
  UgcDetailsComponent,
  UgcTrackDataComponent,
  TrackPropertiesComponent,
  ModalImageComponent,
  TabImageGalleryComponent,
  ImageGalleryComponent,
  TrackRelatedPoiComponent
  
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
      EffectsModule.forFeature([
        EcEffects,
        ConfEffects,
        AuthEffects,
        UgcEffects,
        UserActivityEffects,
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
  providers: [
    LangService,
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    UrlHandlerService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeUrlHandler,
      deps: [UrlHandlerService],
      multi: true, // Permette più inizializzatori contemporaneamente
    },
  ],
  exports: [...declarations, ...modules, TranslateModule],
})
export class WmCoreModule {}

export function httpTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function initializeUrlHandler(urlHandlerService: UrlHandlerService) {
  return () => urlHandlerService.initialize();
}
