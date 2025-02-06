import {createAction, props} from '@ngrx/store';

export const startNetworkMonitoring = createAction('[network] Start network monitoring');
export const startNetworkMonitoringSuccess = createAction(
  '[network] network monitoring is started',
  props<{online: boolean}>(),
);
export const startNetworkMonitoringFail = createAction('[network] network monitoring error');
