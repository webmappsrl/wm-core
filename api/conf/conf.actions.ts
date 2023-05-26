import {createAction, props} from '@ngrx/store';

export const loadConf = createAction('[conf] Load configuration');
export const loadConfSuccess = createAction(
  '[conf] Load configuration Success',
  props<{conf: ICONF}>(),
);
export const loadConfFail = createAction('[conf] Load configuration Fail');
