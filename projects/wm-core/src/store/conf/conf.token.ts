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
