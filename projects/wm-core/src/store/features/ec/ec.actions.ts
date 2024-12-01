import {createAction, props} from '@ngrx/store';
import {FeatureCollection} from 'geojson';
import {IRESPONSE} from '@wm-core/types/elastic';
import {Filter} from '../../../types/config';

export const queryEc = createAction(
  '[ec] Query',
  props<{
    init?: boolean;
    layer?: number;
    inputTyped?: string;
    filterTracks?: {identifier: string}[];
  }>(),
);
export const queryEcSuccess = createAction('[ec] Search Success', props<{response: IRESPONSE}>());
export const queryEcFail = createAction('[ec] Search Fail');
export const addTrackFilters = createAction(
  '[ec] add track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const inputTyped = createAction(
  '[ec] set input typed',
  props<{inputTyped: string | null}>(),
);
export const removeTrackFilters = createAction(
  '[ec] remove track filters',
  props<{trackFilters: {identifier: string}[]}>(),
);
export const resetTrackFilters = createAction('[ec] reset track filters');
export const setLayer = createAction('[ec] set Layer', props<{layer: any | null}>());
export const setLastFilterType = createAction(
  '[ec] set last filter type',
  props<{filter: 'tracks' | 'pois' | null}>(),
);
export const toggleTrackFilter = createAction(
  '[ec] toggle track filter',
  props<{filter: Filter}>(),
);
export const toggleTrackFilterByIdentifier = createAction(
  '[ec] toggle track filter by identifier',
  props<{identifier: string; taxonomy?: string}>(),
);
export const goToHome = createAction('[ec] go to home');
export const updateTrackFilter = createAction(
  '[ec] update track filter',
  props<{filter: Filter}>(),
);

export const loadEcPois = createAction('[ec] pois: Load pois');
export const loadEcPoisSuccess = createAction(
  '[ec] pois: Load pois Success',
  props<{featureCollection: FeatureCollection}>(),
);
export const loadEcPoisFail = createAction('[ec] pois: Load pois Fail');
export const applyWhere = createAction('[ec] pois: apply where', props<{where: string[]}>());
export const togglePoiFilter = createAction(
  '[ec] pois toggle filter',
  props<{filterIdentifier: string}>(),
);
export const resetPoiFilters = createAction('[ec] pois: reset all pois filters');
