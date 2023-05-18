import {createAction, props} from '@ngrx/store';

export const query = createAction(
  '[api] Query',
  props<{layer?: number; inputTyped?: string; activities?: string[]}>(),
);
export const queryApiSuccess = createAction('[api] Search Success', props<{search: IELASTIC}>());
export const queryApiFail = createAction('[api] Search Fail');

export const addActivities = createAction('[api] add activities', props<{activities: string[]}>());
export const removeActivities = createAction(
  '[api] remove activities',
  props<{activities: string[]}>(),
);
export const resetActivities = createAction('[api] reset activities');

export const setLayerID = createAction('[api] set Layer', props<{layerID: number | null}>());
