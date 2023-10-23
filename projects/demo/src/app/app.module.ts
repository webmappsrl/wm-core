import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ENVIRONMENT_CONFIG } from '../../../wm-core/src/store/conf/conf.token';
import { environment } from '../environments/environment';
import { WmCoreModule } from '../../../wm-core/src/wm-core.module';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    WmCoreModule,
    AppRoutingModule,
        StoreModule.forRoot(
      {
      },
      {},
    ),
    EffectsModule.forRoot(),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production, // Restrict extension to log-only mode
    }),
  ],
  providers: [
    { provide: ENVIRONMENT_CONFIG, useValue: environment }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
