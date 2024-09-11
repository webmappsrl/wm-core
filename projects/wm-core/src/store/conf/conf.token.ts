import {InjectionToken} from '@angular/core';
export interface EnvironmentConfig {
  api: string;
  awsApi: string;
  elasticApi: string;
  geohubId: number;
  graphhopperHost: string;
  production: boolean;
}
export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('environmentConfig');
export const APP_ID = new InjectionToken<string>('appIdToken');
export const APP_VERSION = new InjectionToken<string>('APP_VERSION');
