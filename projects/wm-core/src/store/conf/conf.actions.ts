import {createAction, props} from '@ngrx/store';
import {ICONF} from '../../types/config';

export const loadConf = createAction('[conf] Load configuration');
export const loadConfSuccess = createAction(
  '[conf] Load configuration Success',
  props<{conf: ICONF}>(),
);
export const loadConfFail = createAction('[conf] Load configuration Fail');

export const updateMapWithUgc = createAction(
  '[conf] Update Map With UGC',
  props<{activableUgc: boolean}>(),
);
export const isMobile = createAction('[conf] Is Mobile', props<{isMobile: boolean}>());
