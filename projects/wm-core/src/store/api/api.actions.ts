import {createAction, props} from '@ngrx/store';
import {FeatureCollection, Point} from 'geojson';
import {IRESPONSE} from '@wm-core/types/elastic';
import {Filter} from '../../types/config';
import {WmFeature} from '@wm-types/feature';
import {HttpErrorResponse} from '@angular/common/http';

export const query = createAction(
  '[api] Query',
  props<{
    init?: boolean;
    layer?: number;
    inputTyped?: string;
    filterTracks?: {identifier: string}[];
  }>(),
);
export const queryApiSuccess = createAction('[api] Search Success', props<{response: IRESPONSE}>());
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
export const setUgc = createAction('[api] set Ugc', props<{ugcSelected: boolean}>());
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

export const loadUgcPois = createAction('[api] ugc pois: Load ugc pois');
export const loadUgcPoisSuccess = createAction(
  '[api] ugc pois: Load ugc pois Success',
  props<{featureCollection: WmFeature<Point>[]}>(),
);
export const loadUgcPoisFail = createAction('[api] ugc pois: Load ugc pois Fail');
export const openUgcInHome = createAction('[api] ugc: Ugc in home', props<{ugcHome: boolean}>());
export const syncUgc = createAction('[Auth] Sync Ugc Track');
export const syncUgcSuccess = createAction('[Auth] Sync Ugc Success');
export const syncUgcFailure = createAction(
  '[Auth] Sync Ugc Failure',
  props<{error: HttpErrorResponse}>(),
);
