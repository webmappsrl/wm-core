import {createAction, props} from '@ngrx/store';
import {Filter, ILAYER} from '@wm-core/types/config';
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
export const toggleTrackFilterByIdentifier = createAction(
  '[User Activity] toggle track filter by identifier',
  props<{identifier: string; taxonomy?: string}>(),
);

export const resetTrackFilters = createAction('[User Activity] reset track filters');
export const updateTrackFilter = createAction(
  '[User Activity] update track filter',
  props<{filter: Filter}>(),
);
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
export const goToHome = createAction('[User Activity] Go to Home');
export const resetMap = createAction('[User Activity] Reset Map');
export const setLayer = createAction('[User Activity] set Layer', props<{layer: any | null}>());
export const setLastFilterType = createAction(
  '[User Activity] set last filter type',
  props<{filter: 'tracks' | 'pois' | null}>(),
);
export const toggleTrackFilter = createAction(
  '[User Activity] toggle track filter',
  props<{filter: Filter}>(),
);

export const applyWhere = createAction(
  '[User Activity] pois: apply where',
  props<{where: string[]}>(),
);
export const togglePoiFilter = createAction(
  '[User Activity] pois toggle filter',
  props<{filterIdentifier: string}>(),
);
export const resetPoiFilters = createAction('[User Activity] pois: reset all pois filters');

export const startLoader = createAction(
  '[User Activity] loader: start loader',
  props<{identifier: 'layer' | 'pois'}>(),
);
export const stopLoader = createAction(
  '[User Activity] loader: stop loader',
  props<{identifier: 'layer' | 'pois'}>(),
);
