import {createFeatureSelector, createSelector} from '@ngrx/store';
import {user} from '../auth/auth.selectors';
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
export const EmptyInputTyped = createSelector(
  userActivity,
  (state: UserActivityState) => state.inputTyped === '' || state.inputTyped === null,
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

export const filterTracks = createSelector(userActivity, state => {
  return state.filterTracks;
});
export const trackFilterIdentifier = createSelector(filterTracks, filterTracks => {
  return filterTracks.map((f: any) => f.identifier);
});
export const lastFilterType = createSelector(userActivity, state => {
  return state.lastFilterType;
});
export const ecLayer = createSelector(userActivity, state => {
  return state.layer;
});

export const showResult = createSelector(
  userActivity,
  ugcOpened,
  inputTyped,
  (state, ugcOpened, inputTyped) => {
    return (
      state.layer != null ||
      state.filterTracks.length > 0 ||
      (state.poisSelectedFilterIdentifiers && state.poisSelectedFilterIdentifiers.length > 0) ||
      (inputTyped != null && inputTyped != '') ||
      ugcOpened
    );
  },
);

export const filterTaxonomies = createSelector(userActivity, state => {
  return state.filterTaxonomies;
});
export const mapFilters = createSelector(userActivity, state => {
  return {
    layer: state.layer,
    filterTracks: state.filterTracks,
    lastFilterType: 'tracks',
  };
});
export const poiFilterIdentifiers = createSelector(
  userActivity,
  state => state.poisSelectedFilterIdentifiers ?? [],
);

export const poisSelectedFilterIdentifiers = createSelector(
  userActivity,
  state => state.poisSelectedFilterIdentifiers,
);

export const loading = createSelector(userActivity, state => state.loading);
export const currentEcLayer = createSelector(userActivity, state => state.layer);
