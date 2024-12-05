import {createReducer, on} from '@ngrx/store';
import {ILAYER} from '@wm-core/types/config';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {
  closeUgc,
  enabledDrawTrack,
  inputTyped,
  openUgc,
  resetTrackFilters,
  setCurrentFilters,
  setCurrentLayer,
  setCurrentPoi,
} from './user-activity.action';

export const key = 'userActivity';
export interface UserActivityState {
  ugcOpened: boolean;
  inputTyped?: string;
  loading: boolean;
  filterTracks: [];
  currentLayer?: ILAYER;
  currentPoi?: WmFeature<Point>;
  currentFilters?: any[];
  drawTrack: boolean;
}

export interface UserAcitivityRootState {
  [key]: UserActivityState;
}

const initialState: UserActivityState = {
  ugcOpened: false,
  loading: true,
  inputTyped: null,
  filterTracks: [],
  drawTrack: false,
};

export const userActivityReducer = createReducer(
  initialState,
  on(openUgc, state => ({...state, ugcOpened: true})),
  on(closeUgc, state => ({...state, ugcOpened: false})),
  on(inputTyped, (state, {inputTyped}) => {
    const newState: UserActivityState = {
      ...state,
      inputTyped,
      loading: true,
    };
    return newState;
  }),
  on(resetTrackFilters, (state, {}) => {
    const newState: UserActivityState = {
      ...state,
      filterTracks: [],
    };
    return newState;
  }),
  on(setCurrentLayer, (state, {currentLayer}) => {
    return {
      ...state,
      ...{currentLayer},
    };
  }),
  on(setCurrentPoi, (state, {currentPoi}) => {
    return {
      ...state,
      ...{currentPoi},
    };
  }),
  on(setCurrentFilters, (state, {currentFilters}) => {
    return {
      ...state,
      ...{currentFilters},
    };
  }),
  on(enabledDrawTrack, (state, {drawTrack}) => {
    return {
      ...state,
      ...{drawTrack},
    };
  }),
);
