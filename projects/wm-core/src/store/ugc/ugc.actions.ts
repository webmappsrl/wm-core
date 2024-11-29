import {createAction, props} from '@ngrx/store';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
export const openUgc = createAction('[Ugc] Open Ugc');
export const closeUgc = createAction('[Ugc] Close Ugc');
export const syncUgc = createAction('[Ugc] Sync');

export const syncUgcTracks = createAction('[Ugc] Sync Tracks');
export const syncUgcPois = createAction('[Ugc] Sync Pois');

export const syncUgcSuccess = createAction('[Ugc] Sync Success', props<{responseType: string}>());
export const syncUgcFailure = createAction(
  '[Ugc] Sync Failure',
  props<{responseType: string; error: any}>(),
);
export const updateUgcTracks = createAction(
  '[Ugc] Update Tracks',
  props<{ugcTrackFeatures: WmFeature<LineString>[]}>(),
);
export const updateUgcPois = createAction(
  '[Ugc] Update Pois',
  props<{ugcPoiFeatures: WmFeature<Point>[]}>(),
);

export const selectUgcTrack = createAction(
  '[Ugc] Select Track',
  props<{trackId: number | string}>(),
);
