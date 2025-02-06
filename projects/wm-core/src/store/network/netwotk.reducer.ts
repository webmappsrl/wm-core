import {createReducer, on} from '@ngrx/store';
import {startNetworkMonitoringSuccess} from './network.actions';

export const confFeatureKey = 'conf';
export interface INetworkRootState {
  online: boolean;
}
const initialNetworkState: INetworkRootState = {
  online: true,
};
export const networkReducer = createReducer(
  initialNetworkState,
  on(startNetworkMonitoringSuccess, (state, {online}) => {
    return {
      ...state,
      ...{online},
    };
  }),
);
