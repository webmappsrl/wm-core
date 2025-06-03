import {createFeatureSelector, createSelector} from '@ngrx/store';
import {currentCustomTrack} from '../features/ugc/ugc.selector';
import {UserActivityState} from './user-activity.reducer';
import {confFlowLineQuote} from '../conf/conf.selector';
import {WmSlopeChartFlowLineQuote} from '@wm-types/slope-chart';

export const userActivity = createFeatureSelector<UserActivityState>('user-activity');

export const mapDetailsStatus = createSelector(
  userActivity,
  (state: UserActivityState) => state.mapDetailsStatus,
);
export const ugcOpened = createSelector(
  userActivity,
  (state: UserActivityState) => state.ugcOpened,
);
export const downloadsOpened = createSelector(
  userActivity,
  (state: UserActivityState) => state.downloadsOpened,
);
export const wmMapHitMapChangeFeatureId = createSelector(
  userActivity,
  (state: UserActivityState) => state.wmMapHitMapChangeFeatureById,
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

export const drawPoiOpened = createSelector(userActivity, state =>
  state && state.drawPoiOpened ? state.drawPoiOpened : false,
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
    return (ftracks?.length ?? 0) === 0 && (fpois?.length ?? 0) > 0;
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
export const showResult = createSelector(
  currentEcLayer,
  filterTracks,
  poisSelectedFilterIdentifiers,
  ugcOpened,
  downloadsOpened,
  inputTyped,
  (
    currentLayer,
    filterTracks,
    poisSelectedFilterIdentifiers,
    ugcOpened,
    downloadsOpened,
    inputTyped,
  ) => {
    const layerCondition = currentLayer != null;
    const filterTracksCondition = filterTracks.length > 0;
    const poisSelectedFilterIdentifiersCondition =
      poisSelectedFilterIdentifiers && poisSelectedFilterIdentifiers.length > 0;
    const inputTypedCondition = inputTyped != null && inputTyped != '';

    return (
      layerCondition ||
      filterTracksCondition ||
      poisSelectedFilterIdentifiersCondition ||
      inputTypedCondition ||
      ugcOpened ||
      downloadsOpened
    );
  },
);

export const flowLineQuoteText = createSelector(
  chartHoverElements,
  confFlowLineQuote,
  (elements, flowLine) => {
    if (!elements?.location?.altitude || !flowLine) return null;

    const {altitude} = elements.location;
    const {flow_line_quote_orange, flow_line_quote_red} = flowLine;
    const html =
      altitude < flow_line_quote_orange
        ? '<span class="green">Livello 1: tratti non interessati dall\'alta quota (quota minore di {{orange}} metri)</span>'
        : altitude > flow_line_quote_orange && altitude < flow_line_quote_red
        ? '<span class="orange">Livello 2: tratti parzialmente in alta quota (quota compresa tra {{orange}} metri e {{red}} metri)</span>'
        : '<span class="red">Livello 3: in alta quota (quota superiore {{red}} metri)</span>';

    const flowLineQuote: WmSlopeChartFlowLineQuote = {
      flow_line_quote_orange,
      flow_line_quote_red,
      html,
    };

    return flowLineQuote;
  },
);
export const wmMapHitmapFeatures = createSelector(userActivity, state => state.wmMapHitmapFeatures);
export const currentHitmapFeature = createSelector(
  wmMapHitMapChangeFeatureId,
  wmMapHitmapFeatures,
  (id, features) => {
    return features.find(f => f.properties.id == id);
  },
);

export const featuresInViewport = createSelector(userActivity, state => state.featuresInViewport);
export const hasFeatureInViewport = createSelector(
  featuresInViewport,
  featuresInViewport => featuresInViewport && featuresInViewport.length > 0,
);
