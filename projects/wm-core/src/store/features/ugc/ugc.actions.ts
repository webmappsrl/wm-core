import {createAction, props} from '@ngrx/store';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
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

export const currentUgcTrackId = createAction(
  '[Ugc] Set current Ugc track id',
  props<{currentUgcTrackId: string | null}>(),
);
export const loadCurrentUgcTrackSuccess = createAction(
  '[Ugc] Load Current UgcTrack Success',
  props<{ugcTrack: WmFeature<LineString>}>(),
);
export const loadCurrentUgcTrackFailure = createAction(
  '[Ugc] Load Current UgcTrack Failure',
  props<{error: any}>(),
);
export const enableSyncInterval = createAction('[Ugc] Enable Sync Interval');
export const disableSyncInterval = createAction('[Ugc] Disable Sync Interval');

export const deleteUgcTrack = createAction(
  '[Ugc] Delete Ugc Track',
  props<{track: WmFeature<LineString>}>(),
);
export const deleteUgcTrackSuccess = createAction('[Ugc] Delete Ugc Track Success', props<{track: WmFeature<LineString>}>());
export const deleteUgcTrackFailure = createAction('[Ugc] Delete Ugc Track Failure', props<{error: string}>());

export const deleteUgcPoi = createAction(
  '[Ugc] Delete Ugc Poi',
  props<{poi: WmFeature<Point>}>(),
);
export const deleteUgcPoiSuccess = createAction('[Ugc] Delete Ugc Poi Success', props<{poi: WmFeature<Point>}>());
export const deleteUgcPoiFailure = createAction('[Ugc] Delete Ugc Poi Failure', props<{error: string}>());
export const updateUgcTrack = createAction(
  '[Ugc] Update Ugc Track',
  props<{track: WmFeature<LineString>}>(),
);
export const updateUgcTrackSuccess = createAction(
  '[Ugc] Update Ugc Track Success',
  props<{track: WmFeature<LineString>}>(),
);
export const updateUgcTrackFailure = createAction(
  '[Ugc] Update Ugc Track Failure',
  props<{error: string}>(),
);
export const updateUgcPoi = createAction('[Ugc] Update Ugc Poi', props<{poi: WmFeature<Point>}>());
export const updateUgcPoiSuccess = createAction(
  '[Ugc] Update Ugc Poi Success',
  props<{poi: WmFeature<Point>}>(),
);
export const updateUgcPoiFailure = createAction(
  '[Ugc] Update Ugc Poi Failure',
  props<{error: string}>(),
);
