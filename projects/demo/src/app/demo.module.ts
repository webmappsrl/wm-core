import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './demo-routing.module';
import {DemoComponent} from './demo.component';
import {environment} from '../environments/environment';
import {WmCoreModule} from '../../../wm-core/src/wm-core.module';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [DemoComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    WmCoreModule,
    AppRoutingModule,
    StoreModule.forRoot({}, {}),
    EffectsModule.forRoot(),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production, // Restrict extension to log-only mode
    }),
  ],
  bootstrap: [DemoComponent],
})
export class AppModule {}
