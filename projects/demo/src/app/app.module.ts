import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ENVIRONMENT_CONFIG} from '../../../wm-core/src/store/conf/conf.token';
import {environment} from '../environments/environment';
import {WmCoreModule} from '../../../wm-core/src/wm-core.module';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {HttpClientModule} from '@angular/common/http';
import {LeftBarModule} from './left-bar/left-bar.module';
import {WebmappTitleModule} from './pages/webmapp-title/webmapp-title.module';
import {WmSlugBoxModule} from './pages/wm-slug-box/wm-slug-box.module';
import {WmLayerBoxModule} from './pages/wm-layer-box/wm-layer-box.module';
import {WmStatusFilterModule} from './pages/wm-status-filter/wm-status-filter.module';
import {WmSearchBoxModule} from './pages/wm-search-box/wm-search-box.module';
import {WmPoiBoxModule} from './pages/wm-poi-box/wm-poi-box.module';
import {WmHorizontalScrollBoxModule} from './pages/wm-horizontal-scroll-box/wm-horizontal-scroll-box.module';
import {IonicModule} from '@ionic/angular';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    WmCoreModule,
    AppRoutingModule,
    LeftBarModule,
    WebmappTitleModule,
    WmSlugBoxModule,
    WmLayerBoxModule,
    WmStatusFilterModule,
    WmSearchBoxModule,
    WmPoiBoxModule,
    WmHorizontalScrollBoxModule,
    StoreModule.forRoot({}, {}),
    EffectsModule.forRoot(),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production, // Restrict extension to log-only mode
    }),
    IonicModule.forRoot(),
  ],
  providers: [{provide: ENVIRONMENT_CONFIG, useValue: environment}],
  bootstrap: [AppComponent],
})
export class AppModule {}
