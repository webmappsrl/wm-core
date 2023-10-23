import { InjectionToken } from '@angular/core';
export interface EnvironmentConfig {
  production: boolean;
  geohubId: number;
  api: string;
  graphhopperHost: string;
}
export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('environmentConfig');
