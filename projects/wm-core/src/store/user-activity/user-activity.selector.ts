import {createFeatureSelector, createSelector} from '@ngrx/store';
import {currentCustomTrack} from '../features/ugc/ugc.selector';
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

export const drawTrackOpened = createSelector(userActivity, state =>
  state && state.drawTrackOpened ? state.drawTrackOpened : false,
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

export const loading = createSelector(userActivity, state => {
  return state.loading['pois'] || state.loading['layer'];
});
export const currentEcLayer = createSelector(userActivity, state => state.layer);

export const homeOpened = createSelector(currentCustomTrack, hasCustomTrack => {
  return hasCustomTrack == null;
});
export const chartHoverElements = createSelector(userActivity, state => state.chartHoverElements);
export const currentEcPoiId = createSelector(userActivity, state => state.currentEcPoiId);
export const onlyPoisFilter = createSelector(
  filterTracks,
  poisSelectedFilterIdentifiers,
  (ftracks, fpois) => {
    return (ftracks.length ?? 0) === 0 && (fpois.length ?? 0) > 0;
  },
);
export const showTracks = createSelector(
  currentEcLayer,
  onlyPoisFilter,
  ugcOpened,
  (currentLayer, onlyPoisFilter, ugcOpened) => {
    return currentLayer != null || !onlyPoisFilter || ugcOpened;
  },
);
