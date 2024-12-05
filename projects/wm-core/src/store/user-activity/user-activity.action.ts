import {createAction, props} from '@ngrx/store';
import {ILAYER} from '@wm-core/types/config';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';

export const openUgc = createAction('[User Activity] Open User Generated Content');
export const closeUgc = createAction('[User Activity] Close User Generated Content');
export const inputTyped = createAction(
  '[User Activity] set input typed',
  props<{inputTyped: string | null}>(),
);
export const setLoading = createAction('[User Activity] Set Loading', props<{loading: boolean}>());

export const addTrackFilters = createAction(
  '[User Activity] add track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const removeTrackFilters = createAction(
  '[User Activity] remove track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const resetTrackFilters = createAction('[User Activity] reset track filters');

export const setCurrentLayer = createAction(
  '[User Activity] Set current layer',
  props<{currentLayer: ILAYER}>(),
);
export const setCurrentPoi = createAction(
  '[User Activity] Set current poi',
  props<{currentPoi: WmFeature<Point>}>(),
);
export const setCurrentFilters = createAction(
  '[User Activity] Set current Filters',
  props<{currentFilters: any[]}>(),
);
export const enabledDrawTrack = createAction(
  '[User Activity] Enable draw track',
  props<{drawTrack: boolean}>(),
);

export const loadConfFail = createAction('[User Activity] Set current layer Success Fail');
