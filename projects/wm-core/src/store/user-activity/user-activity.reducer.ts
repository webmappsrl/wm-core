import {createReducer, on} from '@ngrx/store';
import {closeUgc, inputTyped, openUgc} from './user-activity.action';

export const key = 'userActivity';
export interface UserActivityState {
  ugcOpened: boolean;
  inputTyped?: string;
  loading: boolean;
}

export interface UserAcitivityRootState {
  [key]: UserActivityState;
}

const initialState: UserActivityState = {
  ugcOpened: false,
  loading: true,
  inputTyped: null,
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
);