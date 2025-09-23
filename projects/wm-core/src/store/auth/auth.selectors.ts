import {createFeatureSelector, createSelector} from '@ngrx/store';
import * as fromAuth from './auth.reducer';
import {confWEBAPP} from '../conf/conf.selector';

export const selectAuthState = createFeatureSelector<fromAuth.AuthState>(fromAuth.authFeatureKey);
export const isLogged = createSelector(selectAuthState, state => state != null && state.isLogged);
export const error = createSelector(selectAuthState, state => state != null && state.error);
export const user = createSelector(selectAuthState, state => state.user);
export const saveDrawTrackAsUgc = createSelector(isLogged, confWEBAPP, (isLogged, conf) => {
  return conf.draw_track_show && isLogged;
});
export const hasPrivacyConsent = createSelector(user, user => {
  // Check both user model and localStorage
  const userConsent = user?.privacy_consent === true;
  const localConsent = localStorage.getItem('privacy_consent') === 'true';
  return userConsent || localConsent;
});

// Helper function to check localStorage consent
export const hasLocalStoragePrivacyConsent = () => {
  return localStorage.getItem('privacy_consent') === 'true';
};
export const needsPrivacyConsent = createSelector(
  isLogged,
  hasPrivacyConsent,
  (isLogged, hasConsent) => {
    return isLogged && !hasConsent;
  },
);
