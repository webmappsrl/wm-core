import {InjectionToken} from '@angular/core';
import {Translations} from '@wm-types/language';
export interface EnvironmentConfig {
  api: string;
  awsApi: string;
  elasticApi: string;
  geohubId: number;
  graphhopperHost: string;
  production: boolean;
  shard: string;
}
export const APP_VERSION = new InjectionToken<string>('APP_VERSION');
export const APP_TRANSLATION = new InjectionToken<Translations>('APP_TRANSLATION')
