import {createFeatureSelector, createSelector} from '@ngrx/store';
import * as fromAuth from './auth.reducer';
import {confWEBAPP} from '../conf/conf.selector';

export const selectAuthState = createFeatureSelector<fromAuth.AuthState>(fromAuth.authFeatureKey);
export const isLogged = createSelector(selectAuthState, state => state != null && state.isLogged);
export const error = createSelector(selectAuthState, state => state != null && state.error);
export const user = createSelector(selectAuthState, state => {
  return state.user;
});
export const saveDrawTrackAsUgc = createSelector(isLogged, confWEBAPP, (isLogged, conf) => {
  return conf.draw_track_show && isLogged;
});
