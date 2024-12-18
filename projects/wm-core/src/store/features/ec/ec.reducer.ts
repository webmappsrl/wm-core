import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {createReducer, on} from '@ngrx/store';
import {
  loadEcPoisSuccess,
  ecTracksFailure,
  ecTracksSuccess,
  loadCurrentEcTrackSuccess,
  loadCurrentEcTrackFailure,
  ecTracks,
  currentEcRelatedPoiId,
  loadCurrentEcPoiSuccess,
  loadCurrentEcPoiFailure,
} from '@wm-core/store/features/ec/ec.actions';

import {IHIT} from '@wm-core/types/elastic';
import {LineString} from 'geojson';

export const searchKey = 'search';
export interface Ec {
  ecPoiFeatures?: WmFeature<Point>[];
  hits?: IHIT[];
  ecTracksLoading: boolean;
  aggregations?: any;
  currentEcTrack?: WmFeature<LineString>;
  currentEcPoi?: WmFeature<Point>;
  currentEcRelatedPoiId?: string;
}
export interface ApiRootState {
  [searchKey]: Ec;
}

const initialConfState: Ec = {
  ecPoiFeatures: null,
  hits: [],
  ecTracksLoading: false,
};

export const ecReducer = createReducer(
  initialConfState,
  on(ecTracks, state => {
    return {
      ...state,
      ecTracksLoading: true,
    };
  }),
  on(ecTracksSuccess, (state, {response}) => {
    const newState: Ec = {
      ...state,
      hits: response.hits,
      aggregations: response.aggregations,
      ecTracksLoading: false,
    };
    return newState;
  }),
  on(ecTracksFailure, state => {
    return {
      ...state,
      ecTracksLoading: false,
    };
  }),
  on(loadEcPoisSuccess, (state, {featureCollection}) => {
    const ecPoiFeatures = featureCollection.features as WmFeature<Point>[];
    const newState: Ec = {
      ...state,
      ecPoiFeatures,
    };
    return newState;
  }),
  on(loadCurrentEcTrackSuccess, (state, {ecTrack}) => {
    const newState: Ec = {
      ...state,
      currentEcTrack: ecTrack,
    };
    return newState;
  }),
  on(loadCurrentEcTrackFailure, state => {
    const newState: Ec = {
      ...state,
      currentEcTrack: null,
    };
    return newState;
  }),
  on(currentEcRelatedPoiId, (state, {currentRelatedPoiId}) => {
    const newState: Ec = {
      ...state,
      currentEcRelatedPoiId: currentRelatedPoiId,
    };
    return newState;
  }),
  on(loadCurrentEcPoiSuccess, (state, {ecPoi}) => {
    const newState: Ec = {
      ...state,
      currentEcPoi: ecPoi,
    };
    return newState;
  }),
  on(loadCurrentEcPoiFailure, state => {
    const newState: Ec = {
      ...state,
      currentEcPoi: null,
    };
    return newState;
  }),
);
