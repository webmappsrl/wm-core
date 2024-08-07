import { createReducer, on } from "@ngrx/store";
import * as AuthActions from './auth.actions';

export const authFeatureKey = 'auth';

export interface AuthState {
  error?: string;
  isLogged: boolean;
  user?: IGeohubApiLogin;
}

export const initialState: AuthState = {
  isLogged: false,
};


export const authReducer = createReducer(
  initialState,
  on(AuthActions.loadSignInsSuccess, (state, {user}) => {
    localStorage.setItem('access_token', user.access_token);
    return {
      ...state,
      isLogged: true,
      user
    };
  }),
  on(AuthActions.loadSignInsFailure, (state, {error}) => {
    localStorage.removeItem('access_token');
    return {
      ...state,
      user: undefined,
      isLogged: false,
      error,
    };
  })
);
