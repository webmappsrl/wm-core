import {createAction, props} from '@ngrx/store';
import {FeatureCollection, LineString} from 'geojson';
import {IRESPONSE} from '@wm-core/types/elastic';
import {Filter} from '../../../types/config';
import {WmFeature} from '@wm-types/feature';

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

export const currentEcTrackId = createAction(
  '[EcTrack] Set current ec track id',
  props<{currentEcTrackId: string | null}>(),
);
export const loadCurrentEcTrackSuccess = createAction(
  '[EcTrack] Load Current EcTrack Success',
  props<{ecTrack: WmFeature<LineString>}>(),
);
export const loadCurrentEcTrackFailure = createAction(
  '[EcTrack] Load Current EcTrack Failure',
  props<{error: any}>(),
);
