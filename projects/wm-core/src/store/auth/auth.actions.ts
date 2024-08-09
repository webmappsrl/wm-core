import {HttpErrorResponse} from '@angular/common/http';
import {createAction, props} from '@ngrx/store';
import {IUser} from './auth.model';

export const loadSignUps = createAction(
  '[Auth] Load SignUps',
  props<{name: string; email: string; password: string; referrer?: string}>(),
);
export const loadSignUpsSuccess = createAction(
  '[Auth] Load SignUps Success',
  props<{user: IUser}>(),
);
export const loadSignUpsFailure = createAction(
  '[Auth] Load SignUps Failure',
  props<{error: HttpErrorResponse}>(),
);

export const loadSignIns = createAction(
  '[Auth] Load SignIns',
  props<{email: string; password: string; referrer?: string}>(),
);
export const loadSignInsSuccess = createAction(
  '[Auth] Load SignIns Success',
  props<{user: IUser}>(),
);
export const loadSignInsFailure = createAction(
  '[Auth] Load SignIns Failure',
  props<{error: HttpErrorResponse}>(),
);

export const loadAuths = createAction('[Auth] Load Auths');
export const loadAuthsSuccess = createAction('[Auth] Load Auths Success', props<{user: IUser}>());
export const loadAuthsFailure = createAction(
  '[Auth] Load Auths Failure',
  props<{error: HttpErrorResponse}>(),
);

export const deleteUser = createAction('[Auth] Delete user');
export const deleteUserSuccess = createAction('[Auth] Delete user success');
export const deleteUserFailure = createAction(
  '[Auth] Delete user failure',
  props<{error: HttpErrorResponse}>(),
);

export const loadSignOuts = createAction('[Auth] Logout');
export const loadSignOutsSuccess = createAction('[Auth] Logout success');
export const loadSignOutsFailure = createAction(
  '[Auth] Logout failure',
  props<{error: HttpErrorResponse}>(),
);
