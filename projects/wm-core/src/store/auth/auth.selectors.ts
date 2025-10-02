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
  // Check both user model and localStorage
  const userPrivacyAgree = user?.privacy_agree === true;
  const localPrivacyAgree = localStorage.getItem('privacy_agree') === 'true';

  // Priority: If user is logged in, localStorage should be synced with backend
  // If user is not logged in, use localStorage only (offline mode)
  if (user) {
    // User is logged in - localStorage should reflect backend state
    return localPrivacyAgree;
  } else {
    // User is not logged in - use localStorage as fallback
    return localPrivacyAgree;
  }
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