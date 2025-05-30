import {LineString, Point} from 'geojson';
import {createReducer, on} from '@ngrx/store';
import {
  syncUgc,
  syncUgcFailure,
  syncUgcTracks,
  syncUgcPois,
  updateUgcTracks,
  updateUgcPois,
  loadCurrentUgcTrackSuccess,
  loadCurrentUgcTrackFailure,
  enableSyncInterval,
  disableSyncInterval,
  deleteUgcTrackSuccess,
  updateUgcTrackSuccess,
  loadcurrentUgcPoiIdSuccess,
  loadcurrentUgcPoiIdFailure,
  currentCustomTrack,
  updateUgcPoiSuccess,
  deleteUgcPoiSuccess,
} from '@wm-core/store/features/ugc/ugc.actions';
import {WmFeature} from '@wm-types/feature';
import {Hit} from '@wm-types/elastic';
export const searchKey = 'search';
export interface UgcState {
  syncing: boolean;
  syncable: boolean;
  ugcPoiFeatures?: WmFeature<Point>[];
  ugcTrackFeatures?: WmFeature<LineString>[];
  ugcTracks: Hit[];
  ugcPois: Hit[];
  currentUgcTrack?: WmFeature<LineString>;
  currentUgcPoi?: WmFeature<Point>;
  syncUgcIntervalEnabled: boolean;
  currentCustomTrack?: WmFeature<LineString>;
}
export interface ApiRootState {
  [searchKey]: UgcState;
}

const initialState: UgcState = {
  ugcPoiFeatures: [],
  ugcTrackFeatures: [],
  syncing: false,
  syncable: false,
  ugcTracks: [],
  ugcPois: [],
  syncUgcIntervalEnabled: true,
  currentCustomTrack: null,
};

export const UgcReducer = createReducer(
  initialState,
  on(syncUgc, syncUgcTracks, syncUgcPois, state => ({
    ...state,
    syncing: true,
  })),
  on(updateUgcTracks, (state, {ugcTrackFeatures}) => {
    const ugcTracks = wmFeatureToHits(ugcTrackFeatures);
    return {
      ...state,
      ugcTrackFeatures,
      ugcTracks,
    };
  }),
  on(updateUgcPois, (state, {ugcPoiFeatures}) => {
    const ugcPois = wmFeatureToHits(ugcPoiFeatures);
    return {
      ...state,
      ugcPoiFeatures,
      ugcPois,
    };
  }),
  on(syncUgcFailure, (state, {responseType, error}) => ({
    ...state,
    syncing: false,
  })),
  on(loadCurrentUgcTrackSuccess, (state, {ugcTrack}) => ({
    ...state,
    currentUgcTrack: ugcTrack,
  })),
  on(loadCurrentUgcTrackFailure, (state, {error}) => ({
    ...state,
    error,
  })),
  on(loadcurrentUgcPoiIdSuccess, (state, {ugcPoi}) => ({
    ...state,
    currentUgcPoi: ugcPoi,
  })),
  on(loadcurrentUgcPoiIdFailure, (state, {error}) => ({
    ...state,
    error,
  })),
  on(enableSyncInterval, state => ({
    ...state,
    syncIntervalEnabled: true,
  })),
  on(disableSyncInterval, state => ({
    ...state,
    syncIntervalEnabled: false,
  })),
  on(deleteUgcTrackSuccess, state => ({
    ...state,
    currentUgcTrack: undefined,
  })),
  on(deleteUgcPoiSuccess, state => ({
    ...state,
    currentUgcPoi: undefined,
  })),
  on(updateUgcTrackSuccess, (state, {track}) => ({
    ...state,
    currentUgcTrack: track,
  })),
  on(updateUgcPoiSuccess, (state, {poi}) => ({
    ...state,
    currentUgcPoi: poi,
  })),
  on(currentCustomTrack, (state, {currentCustomTrack}) => ({
    ...state,
    currentCustomTrack,
  })),
);
export function wmFeatureToHits(features: WmFeature<LineString | Point>[]): Hit[] {
  const hits: Hit[] = [];

  features.forEach(feature => {
    const activity = feature.properties?.form?.activity;
    const hit: Hit = {
      id: `${feature.properties.id ?? feature.properties.uuid}`,
      taxonomyActivities: activity ? [activity] : [],
      taxonomyWheres: [],
      cai_scale: '',
      distance: '',
      feature_image: null,
      layers: [],
      name: feature.properties.name,
      properties: feature.properties,
      ref: '',
    };

    hits.push(hit);
  });

  return hits;
}
