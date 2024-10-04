import {createFeatureSelector, createSelector} from '@ngrx/store';
import * as fromAuth from './auth.reducer';

export const selectAuthState = createFeatureSelector<fromAuth.AuthState>(fromAuth.authFeatureKey);
export const isLogged = createSelector(selectAuthState, state => state != null && state.isLogged);
export const error = createSelector(selectAuthState, state => state != null && state.error);
export const loading = createSelector(selectAuthState, state => state.loading);
export const syncing = createSelector(selectAuthState, state => state.syncing);
export const user = createSelector(selectAuthState, state => {
  return state.user;
});
