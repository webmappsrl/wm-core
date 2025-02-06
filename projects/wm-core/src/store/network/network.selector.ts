import {createFeatureSelector, createSelector} from '@ngrx/store';

const networkFeature = createFeatureSelector<any>('network');
export const online = createSelector(networkFeature, state => state.online);
export const offline = createSelector(networkFeature, state => !state.online);
