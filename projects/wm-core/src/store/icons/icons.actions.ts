import {createAction, props} from '@ngrx/store';
import {ICONS} from '@wm-types/config';

export const loadIcons = createAction('[conf] Load Icons');
export const loadIconsSuccess = createAction('[conf] Load Icons Success', props<{icons: ICONS}>());
export const loadIconsFail = createAction('[conf] Load Icons Fail');
