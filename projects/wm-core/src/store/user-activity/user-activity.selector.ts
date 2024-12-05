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

export const UICurrentPoi = createSelector(userActivity, state =>
  state && state.currentPoi ? state.currentPoi : null,
);
export const UICurrentPoiId = createSelector(
  UICurrentPoi,
  UICurrentPoi => UICurrentPoi?.properties?.id ?? null,
);

export const enabledDrawTrack = createSelector(userActivity, state =>
  state && state.drawTrack ? state.drawTrack : false,
);
