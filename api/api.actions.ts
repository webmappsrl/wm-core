import {createAction, props} from '@ngrx/store';

export const query = createAction('[api] Query', props<{layer?: number; inputTyped?: string}>());
export const queryApiSuccess = createAction('[api] Search Success', props<{search: IELASTIC}>());
export const queryApiFail = createAction('[api] Search Fail');
