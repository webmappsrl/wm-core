import { createAction, props } from "@ngrx/store";

export const loadSignIns = createAction(
  '[Auth] Load SignIns',
  props<{email: string, password: string}>(),
);
export const loadSignInsSuccess = createAction(
  '[Auth] Load SignIns Success',
  props<{user: IGeohubApiLogin}>(),
);
export const loadSignInsFailure = createAction(
  '[Auth] Load SignIns Failure',
  props<{error: string}>(),
);
