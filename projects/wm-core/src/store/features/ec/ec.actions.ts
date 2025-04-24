import {createAction, props} from '@ngrx/store';
import {FeatureCollection, LineString, Point} from 'geojson';
import {IRESPONSE} from '@wm-core/types/elastic';
import {Filter} from '../../../types/config';
import {WmFeature} from '@wm-types/feature';

export const ecTracks = createAction(
  '[ec] ecTracks',
  props<{
    init?: boolean;
    layer?: number;
    inputTyped?: string;
    filterTracks?: Filter[];
    currentEcTrackId?: string;
  }>(),
);
export const ecTracksSuccess = createAction(
  '[ec] Load ec tracks success',
  props<{response: IRESPONSE}>(),
);
export const ecTracksFailure = createAction('[ec] Load ec tracks fail');

export const loadEcPois = createAction('[ec] Load ec pois');
export const loadEcPoisSuccess = createAction(
  '[ec] Load ec pois success',
  props<{featureCollection: FeatureCollection}>(),
);
export const loadEcPoisFailure = createAction('[ec] Load ec pois failure');

export const currentEcTrackId = createAction(
  '[ec] Set current ec track id',
  props<{currentEcTrackId: string | null}>(),
);
export const currentEcLayerId = createAction(
  '[ec] Set current ec layer id',
  props<{currentEcLayerId: number | null}>(),
);
export const currentEcPoiId = createAction(
  '[ec] Set current ec poi id',
  props<{currentEcPoiId: number | null}>(),
);
export const loadCurrentEcTrackSuccess = createAction(
  '[ec] Load Current EcTrack Success',
  props<{ecTrack: WmFeature<LineString>}>(),
);
export const loadCurrentEcTrackFailure = createAction(
  '[ec] Load Current EcTrack Failure',
  props<{error: any}>(),
);
export const currentEcRelatedPoiId = createAction(
  '[ec] Set current ec related poi id',
  props<{currentRelatedPoiId: string | null}>(),
);
