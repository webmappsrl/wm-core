import {createFeatureSelector, createSelector} from '@ngrx/store';
import * as fromAuth from './auth.reducer';
import {confWEBAPP} from '../conf/conf.selector';

// Helper function to check localStorage consent
export const hasLocalStorageDataConsent = () => {
  return localStorage.getItem('privacy_consent') === 'true';
};

export const selectAuthState = createFeatureSelector<fromAuth.AuthState>(fromAuth.authFeatureKey);
export const error = createSelector(selectAuthState, state => state != null && state.error);
export const user = createSelector(selectAuthState, state => state.user);
export const hasDataConsent = createSelector(user, user => {
  // Check both user model and localStorage
  const userConsent = user?.privacy_consent === true;
  const localConsent = localStorage.getItem('privacy_consent') === 'true';

  // Priority: If user is logged in, localStorage should be synced with backend
  // If user is not logged in, use localStorage only (offline mode)
  if (user) {
    // User is logged in - localStorage should reflect backend state
    return localConsent;
  } else {
    // User is not logged in - use localStorage as fallback
    return localConsent;
  }
});
export const isLogged = createSelector(selectAuthState, state => state != null && state.isLogged);
export const needsDataConsent = createSelector(isLogged, hasDataConsent, (isLogged, hasConsent) => {
  return isLogged && !hasConsent;
});
export const saveDrawTrackAsUgc = createSelector(isLogged, confWEBAPP, (isLogged, conf) => {
  return conf.draw_track_show && isLogged;
});
