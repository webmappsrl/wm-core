import {createFeatureSelector, createSelector} from '@ngrx/store';
import {UserActivityState} from './user-activity.reducer';

export const userActivity = createFeatureSelector<UserActivityState>('user-activity');

export const ugcOpened = createSelector(
  userActivity,
  (state: UserActivityState) => state.ugcOpened,
);

export const inputTyped = createSelector(
  userActivity,
  (state: UserActivityState) => state.inputTyped,
);
