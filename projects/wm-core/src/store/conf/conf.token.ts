import {InjectionToken} from '@angular/core';
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
