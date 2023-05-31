import {createAction, props} from '@ngrx/store';
import {FeatureCollection} from 'geojson';

export const query = createAction(
  '[api] Query',
  props<{layer?: number; inputTyped?: string; activities?: string[]}>(),
);
export const queryApiSuccess = createAction('[api] Search Success', props<{search: IELASTIC}>());
export const queryApiFail = createAction('[api] Search Fail');
export const addActivities = createAction('[api] add activities', props<{activities: string[]}>());
export const inputTyped = createAction(
  '[api] set input typed',
  props<{inputTyped: string | null}>(),
);
export const removeActivities = createAction(
  '[api] remove activities',
  props<{activities: string[]}>(),
);
export const resetActivities = createAction('[api] reset activities');
export const setLayer = createAction('[api] set Layer', props<{layer: any | null}>());
export const toggleTrackFilter = createAction(
  '[api] toggle track filter',
  props<{filterIdentifier: string}>(),
);

export const loadPois = createAction('[api] pois: Load pois');
export const loadPoisSuccess = createAction(
  '[api] pois: Load pois Success',
  props<{featureCollection: FeatureCollection}>(),
);
export const loadPoisFail = createAction('[api] pois: Load pois Fail');
export const applyWhere = createAction('[api] pois: apply where', props<{where: string[]}>());
export const togglePoiFilter = createAction(
  '[api] pois toggle filter',
  props<{filterIdentifier: string}>(),
);
export const resetPoiFilters = createAction('[api] pois: reset all pois filters');
