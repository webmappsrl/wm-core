import {createReducer, on} from '@ngrx/store';
import {closeUgc, inputTyped, openUgc, resetTrackFilters} from './user-activity.action';

export const key = 'userActivity';
export interface UserActivityState {
  ugcOpened: boolean;
  inputTyped?: string;
  loading: boolean;
  filterTracks: [];
}

export interface UserAcitivityRootState {
  [key]: UserActivityState;
}

const initialState: UserActivityState = {
  ugcOpened: false,
  loading: true,
  inputTyped: null,
  filterTracks: [],
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
);
