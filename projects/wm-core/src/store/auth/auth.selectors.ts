import {createFeatureSelector, createSelector} from '@ngrx/store';
import * as fromAuth from './auth.reducer';
import {confWEBAPP} from '../conf/conf.selector';

// Helper function to check localStorage privacy agree
export const hasLocalStoragePrivacyAgree = () => {
  return localStorage.getItem('privacy_agree') === 'true';
};

export const selectAuthState = createFeatureSelector<fromAuth.AuthState>(fromAuth.authFeatureKey);
export const isLogged = createSelector(selectAuthState, state => state != null && state.isLogged);
export const error = createSelector(selectAuthState, state => state != null && state.error);
export const user = createSelector(selectAuthState, state => state.user);
export const hasPrivacyAgree = createSelector(user, user => {
  // Always use localStorage as the source of truth
  // localStorage is synced with backend when user is logged in
  return localStorage.getItem('privacy_agree') === 'true';
});
export const needsPrivacyAgree = createSelector(
  isLogged,
  hasPrivacyAgree,
  (isLogged, hasPrivacyAgree) => {
    return isLogged && !hasPrivacyAgree;
  },
);
export const saveDrawTrackAsUgc = createSelector(isLogged, confWEBAPP, (isLogged, conf) => {
  return conf.draw_track_show && isLogged;
});