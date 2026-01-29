import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {CUSTOM_ELEMENTS_SCHEMA, inject, NgModule, provideAppInitializer} from '@angular/core';
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
import {ModalUgcUploaderComponent} from './modal-ugc-uploader/modal-ugc-uploader.component';
import {NetworkEffects} from './store/network/network.effects';
import {networkReducer} from './store/network/netwotk.reducer';
import {WmHomeHitMapComponent} from './home/home-hitmap/home-hitmap.component';
import {MetaComponent} from './meta/meta.component';
import {GetDirectionsComponent} from './get-directions/get-directions.component';
import {TravelModeComponent} from './travel-mode/travel-mode.component';
import {PoiTypesBadgesComponent} from './poi-types-badges/poi-types-badges.component';
import {WmRelatedPoisNavigatorComponent} from './releted-pois-navigator/related-pois-navigator.component';
import {ImageDetailComponent} from './image-detail/image-detail.component';
import {WmFeaturesInViewportComponent} from './features-in-viewport/features-in-viewport.component';
import {WmDifficultyComponent} from './difficulty/difficulty.component';
import {WmImagePickerComponent} from './image-picker/image-picker.component';
import {ModalGetDirectionsComponent} from './modal-get-directions/modal-get-directions.component';
import {ModalReleaseUpdateComponent} from './modal-release-update/modal-release-update.component';
import {WmDrawUgcComponent} from './draw-ugc/draw-ugc.component';
import {WmDrawUgcButtonComponent} from './draw-ugc-button/draw-ugc-button.component';
import {iconsReducer} from './store/icons/icons.reducer';
import {IconsEffects} from './store/icons/icons.effects';
import {register} from 'swiper/element/bundle';
import {Capacitor} from '@capacitor/core';
import {PosthogCapacitorClient} from './services/posthog-capacitor.client';
import {EnvironmentService} from './services/environment.service';
import {
  APP_TRANSLATION,
  APP_VERSION,
  ENVIRONMENT_CONFIG,
  POSTHOG_CLIENT,
  POSTHOG_CONFIG,
} from './store/conf/conf.token';
import {WmPosthogConfig} from '@wm-types/posthog';
import {Environment} from '@wm-types/environment';

register();

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
  ModalUgcUploaderComponent,
  WmHomeHitMapComponent,
  MetaComponent,
  GetDirectionsComponent,
  TravelModeComponent,
  PoiTypesBadgesComponent,
  WmRelatedPoisNavigatorComponent,
  ImageDetailComponent,
  WmFeaturesInViewportComponent,
  WmDifficultyComponent,
  WmImagePickerComponent,
  ModalGetDirectionsComponent,
  ModalReleaseUpdateComponent,
  WmDrawUgcComponent,
  WmDrawUgcButtonComponent,
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
      StoreModule.forFeature('icons', iconsReducer),
      EffectsModule.forFeature([
        EcEffects,
        ConfEffects,
        AuthEffects,
        UgcEffects,
        UserActivityEffects,
        NetworkEffects,
        IconsEffects,
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
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    PosthogCapacitorClient,
    {provide: POSTHOG_CLIENT, useExisting: PosthogCapacitorClient},
    provideAppInitializer(async () => {
      const envSvc = inject(EnvironmentService);
      const posthogClient = inject(POSTHOG_CLIENT, {optional: true});
      const environment = inject(ENVIRONMENT_CONFIG, {optional: true});
      const appVersion = inject(APP_VERSION, {optional: true});

      console.log('[WM_CORE_INITIALIZER] Starting initialization...');

      try {
        // Inizializza EnvironmentService
        if (environment) {
          envSvc.init(environment);
          // Aspetta che EnvironmentService sia pronto
          await envSvc.readyPromise;
          console.log('[WM_CORE_INITIALIZER] EnvironmentService initialized');
        }

        // Inizializza PostHog se configurato
        if (posthogClient && environment && appVersion) {
          // Prepara le proprietà super di PostHog con controlli e valori di default
          const appId = envSvc.appId;
          const shardName = envSvc.shardName;
          const appBuild = appVersion;
          const appPlatform = Capacitor.getPlatform();

          // Log per identificare valori undefined
          if (appId === undefined || appId === null) {
            console.error('[PostHog] app_id is undefined/null!', {appId, envSvc});
          }
          if (shardName === undefined || shardName === null) {
            console.error('[PostHog] shard_name is undefined/null!', {shardName, envSvc});
          }
          if (appVersion === undefined || appVersion === null) {
            console.error('[PostHog] app_version is undefined/null!', {appVersion});
          }
          if (appBuild === undefined || appBuild === null) {
            console.error('[PostHog] app_build is undefined/null!', {appBuild});
          }
          if (appPlatform === undefined || appPlatform === null) {
            console.error('[PostHog] app_platform is undefined/null!', {appPlatform});
          }

          // Assicurati che tutti i valori siano definiti
          const posthogProps: Record<string, string | number> = {};

          // app_id deve essere un numero valido (non 0) - manteniamo come numero
          if (appId !== undefined && appId !== null && appId !== 0) {
            posthogProps['app_id'] = appId;
          } else {
            console.warn('[PostHog] app_id is invalid, skipping:', appId);
          }

          // shard_name deve essere una stringa non vuota
          if (shardName && typeof shardName === 'string' && shardName.trim() !== '') {
            posthogProps['shard_name'] = shardName;
          } else {
            console.warn('[PostHog] shard_name is invalid, skipping:', shardName);
          }

          // app_version deve essere una stringa non vuota
          if (appVersion && typeof appVersion === 'string' && appVersion.trim() !== '') {
            posthogProps['app_version'] = appVersion;
          } else {
            console.warn('[PostHog] app_version is invalid, skipping:', appVersion);
          }

          // app_build deve essere una stringa non vuota
          if (appBuild && typeof appBuild === 'string' && appBuild.trim() !== '') {
            posthogProps['app_build'] = appBuild;
          } else {
            console.warn('[PostHog] app_build is invalid, skipping:', appBuild);
          }

          // app_platform deve essere una stringa non vuota e valida
          if (
            appPlatform &&
            typeof appPlatform === 'string' &&
            appPlatform.trim() !== '' &&
            appPlatform !== 'unknown'
          ) {
            posthogProps['app_platform'] = appPlatform;
          } else {
            console.warn('[PostHog] app_platform is invalid, skipping:', appPlatform);
          }

          console.log('[PostHog] Registering properties with values:', posthogProps);
          console.log('[PostHog] Number of valid properties:', Object.keys(posthogProps).length);

          // Inizializza e registra le proprietà super di PostHog in un'unica chiamata
          if (Object.keys(posthogProps).length > 0) {
            await posthogClient.initAndRegister(posthogProps);
          } else {
            console.warn('[PostHog] No valid properties to register, skipping initAndRegister call');
          }
        } else {
          console.log('[WM_CORE_INITIALIZER] PostHog not configured, skipping initialization');
        }

        console.log('[WM_CORE_INITIALIZER] Initialization completed successfully');
      } catch (error) {
        console.error('[WM_CORE_INITIALIZER] Initialization failed:', error);
        // Non rilanciare l'errore per permettere all'app di avviarsi comunque
      }
    }),
  ],
  exports: [...declarations, ...modules, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WmCoreModule {
  static forRoot(config: {
    appVersion: string;
    environment: Environment;
    posthog: WmPosthogConfig;
    translations?: any;
  }) {
    return {
      ngModule: WmCoreModule,
      providers: [
        {provide: APP_VERSION, useValue: config.appVersion},
        {provide: ENVIRONMENT_CONFIG, useValue: config.environment},
        {provide: APP_TRANSLATION, useValue: config.translations || {}},
        {provide: POSTHOG_CONFIG, useValue: config.posthog},
      ],
    };
  }
}

export function httpTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function initializeUrlHandler(urlHandlerService: UrlHandlerService) {
  return () => urlHandlerService.initialize();
}
