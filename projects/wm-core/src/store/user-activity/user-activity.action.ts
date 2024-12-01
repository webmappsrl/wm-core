import {createAction, props} from '@ngrx/store';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';

export const openUgc = createAction('[User Activity] Open User Activity');
export const closeUgc = createAction('[User Activity] Close User Activity');
export const inputTyped = createAction(
  '[ec] set input typed',
  props<{inputTyped: string | null}>(),
);
export const setLoading = createAction('[User Activity] Set Loading', props<{loading: boolean}>());
