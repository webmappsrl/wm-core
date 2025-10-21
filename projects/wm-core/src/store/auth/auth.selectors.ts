import {createFeatureSelector, createSelector} from '@ngrx/store';
import * as fromAuth from './auth.reducer';
import {confWEBAPP} from '../conf/conf.selector';
import { Privacy } from './auth.model';

// Helper function to check localStorage privacy agree
export const hasLocalStoragePrivacyAgree = () => {
  return localStorage.getItem('privacy_agree') === 'true';
};

export const selectAuthState = createFeatureSelector<fromAuth.AuthState>(fromAuth.authFeatureKey);
export const isLogged = createSelector(selectAuthState, state => state != null && state.isLogged);
export const error = createSelector(selectAuthState, state => state != null && state.error);
export const user = createSelector(selectAuthState, state => state.user);

export const privacyUser = createSelector(user, (user)=>{
  let privacy:Privacy|null = null;
  const properties = user.properties;
  const privacyHistory = properties?.privacy;
  if(privacyHistory!= null && privacyHistory.length> 0) {
    privacy = privacyHistory[privacyHistory.length-1];
  }
  return privacy;
})

export const hasPrivacyAgree = createSelector(privacyUser, (privacyUser) => {
  return privacyUser?.agree || false;
})

export const needsPrivacyAgree = createSelector(
  isLogged,
  hasPrivacyAgree,
  (isLogged, hasPrivacyAgree) => {
    return isLogged && !hasPrivacyAgree;
  },
);

export const isLoggedAndHasPrivacyAgree = createSelector(
  isLogged,
  hasPrivacyAgree,
  (isLogged, hasPrivacyAgree) => {
    return isLogged && hasPrivacyAgree;
  },
);

export const saveDrawTrackAsUgc = createSelector(isLogged, confWEBAPP, (isLogged, conf) => {
  return conf.draw_track_show && isLogged;
});

