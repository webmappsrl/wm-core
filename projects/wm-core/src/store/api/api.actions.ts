import {createAction, props} from '@ngrx/store';
import {FeatureCollection} from 'geojson';
import { IHIT } from 'wm-core/types/elastic';
import { Filter } from '../../types/config';

export const query = createAction(
  '[api] Query',
  props<{
    init?: boolean;
    layer?: number;
    inputTyped?: string;
    filterTracks?: {identifier: string}[];
  }>(),
);
export const queryApiSuccess = createAction('[api] Search Success', props<{hits: IHIT[]}>());
export const queryApiFail = createAction('[api] Search Fail');
export const addTrackFilters = createAction(
  '[api] add track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const inputTyped = createAction(
  '[api] set input typed',
  props<{inputTyped: string | null}>(),
);
export const removeTrackFilters = createAction(
  '[api] remove track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const resetTrackFilters = createAction('[api] reset track filters');
export const setLayer = createAction('[api] set Layer', props<{layer: any | null}>());
export const setLastFilterType = createAction(
  '[api] set last filter type',
  props<{filter: 'tracks' | 'pois' | null}>(),
);
export const toggleTrackFilter = createAction(
  '[api] toggle track filter',
  props<{filter: Filter}>(),
);
export const toggleTrackFilterByIdentifier = createAction(
  '[api] toggle track filter by identifier',
  props<{identifier: string; taxonomy?: string}>(),
);
export const goToHome = createAction('[api] go to home');
export const updateTrackFilter = createAction(
  '[api] update track filter',
  props<{filter: Filter}>(),
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
