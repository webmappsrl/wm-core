import {createReducer, on} from '@ngrx/store';
import * as AuthActions from './auth.actions';
import {HttpErrorResponse} from '@angular/common/http';
import {IUser} from './auth.model';

export const authFeatureKey = 'auth';

export interface AuthState {
  error?: HttpErrorResponse;
  isLogged: boolean;
  loading: boolean;
  user?: IUser;
}

export const initialState: AuthState = {
  isLogged: false,
  loading: false,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.loadAuths, AuthActions.loadSignIns, state => {
    return {
      ...state,
      loading: true,
    };
  }),
  on(AuthActions.loadSignUpsSuccess, (state, {user}) => {
    localStorage.setItem('access_token', user.access_token);
    return {
      ...state,
      isLogged: true,
      user,
      error: undefined,
    };
  }),
  on(AuthActions.loadSignUpsFailure, (state, {error}) => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      user: undefined,
      isLogged: false,
      error,
    };
  }),
  on(AuthActions.loadSignInsSuccess, (state, {user}) => {
    localStorage.setItem('access_token', user.access_token);
    return {
      ...state,
      isLogged: true,
      user,
      error: undefined,
      loading: false,
      syncing: true,
    };
  }),
  on(AuthActions.loadSignInsFailure, (state, {error}) => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      user: undefined,
      isLogged: false,
      error,
      loading: false,
    };
  }),
  on(AuthActions.loadAuthsSuccess, (state, {user}) => {
    return {
      ...state,
      isLogged: true,
      user,
      error: undefined,
      loading: false,
      syncing: true,
    };
  }),
  on(AuthActions.loadAuthsFailure, (state, {error}) => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      user: undefined,
      isLogged: false,
      error,
      loading: false,
    };
  }),
  on(AuthActions.loadSignOutsSuccess, state => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      user: undefined,
      isLogged: false,
      error: undefined,
    };
  }),
  on(AuthActions.loadSignOutsFailure, (state, {error}) => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      error,
    };
  }),
  on(AuthActions.deleteUserSuccess, state => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      user: undefined,
      isLogged: false,
      error: undefined,
    };
  }),
  on(AuthActions.deleteUserFailure, (state, {error}) => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      error,
    };
  }),
);
