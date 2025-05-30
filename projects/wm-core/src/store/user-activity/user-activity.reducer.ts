import {createReducer, on} from '@ngrx/store';
import {ILAYER, Filter} from '@wm-core/types/config';
import {WmFeature} from '@wm-types/feature';
import {MultiPolygon, Point} from 'geojson';
import {
  applyWhere,
  closeUgc,
  inputTyped,
  drawTrackOpened,
  openUgc,
  resetPoiFilters,
  resetTrackFilters,
  setCurrentFilters,
  setCurrentLayer,
  setCurrentPoi,
  setLastFilterType,
  setLayer,
  startLoader,
  stopLoader,
  togglePoiFilter,
  toggleTrackFilter,
  updateTrackFilter,
  trackElevationChartHoverElemenents,
  openDownloads,
  closeDownloads,
  wmMapHitMapChangeFeatureById,
  setMapDetailsStatus,
  loadHitmapFeaturesSuccess,
  wmMapFeaturesInViewportSuccess,
} from './user-activity.action';
import {currentEcPoiId} from '../features/ec/ec.actions';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {set} from 'ol/transform';
import {Hit} from '@wm-types/elastic';

export const key = 'userActivity';
export type mapDetailsStatus = 'open' | 'onlyTitle' | 'background' | 'full';
export interface UserActivityState {
  ugcOpened: boolean;
  mapDetailsStatus: mapDetailsStatus;
  downloadsOpened: boolean;
  inputTyped?: string;
  filterTracks: Filter[];
  filterTaxonomies: any[];
  currentLayer?: ILAYER;
  currentPoi?: WmFeature<Point>;
  currentFilters?: any[];
  poisSelectedFilterIdentifiers?: string[];
  layer?: any;
  lastFilterType?: 'tracks' | 'pois' | null;
  loading: {pois: boolean; layer: boolean};
  drawTrackOpened: boolean;
  chartHoverElements: WmSlopeChartHoverElements;
  currentEcPoiId?: any;
  wmMapHitMapChangeFeatureById?: number;
  featuresInViewport: Hit[];
  wmMapHitmapFeatures: WmFeature<MultiPolygon>[];
}

export interface UserAcitivityRootState {
  [key]: UserActivityState;
}

const initialState: UserActivityState = {
  ugcOpened: false,
  mapDetailsStatus: 'background',
  downloadsOpened: false,
  inputTyped: null,
  filterTracks: [],
  drawTrackOpened: false,
  filterTaxonomies: [],
  lastFilterType: null,
  loading: {pois: false, layer: false},
  chartHoverElements: null,
  wmMapHitMapChangeFeatureById: null,
  wmMapHitmapFeatures: [],
  featuresInViewport: [],
};

function extractFilterTaxonomies(layer) {
  if (!layer) return null;
  return [
    ...(layer.taxonomy_wheres ?? [])
      .filter(t => t.identifier != null)
      .map(t => `where_${t.identifier}`),
    ...(layer.taxonomy_activities || [])
      .filter(t => t.identifier != null)
      .map(t => `${t.identifier}`),
    ...(layer.taxonomy_themes || []).filter(t => t.identifier != null).map(t => `${t.identifier}`),
  ];
}

export const userActivityReducer = createReducer(
  initialState,
  on(openUgc, state => ({...state, ugcOpened: true})),
  on(closeUgc, state => ({...state, ugcOpened: false})),
  on(openDownloads, state => ({...state, downloadsOpened: true})),
  on(closeDownloads, state => ({...state, downloadsOpened: false})),
  on(setMapDetailsStatus, (state, {status}) => {
    return {
      ...state,
      mapDetailsStatus: status,
    };
  }),
  on(inputTyped, (state, {inputTyped}) => {
    const newState: UserActivityState = {
      ...state,
      inputTyped,
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
  on(drawTrackOpened, (state, {drawTrackOpened}) => {
    return {
      ...state,
      ...{drawTrackOpened},
    };
  }),
  on(setLayer, (state, {layer}) => {
    let poisSelectedFilterIdentifiers = state.poisSelectedFilterIdentifiers ?? [];
    let filterTaxonomies = [];

    if (layer == null) {
      const filterTaxonomiesPreviousLayer = extractFilterTaxonomies(state.layer) ?? [];
      poisSelectedFilterIdentifiers = poisSelectedFilterIdentifiers.filter(
        i => !filterTaxonomiesPreviousLayer.includes(i),
      );
    } else {
      filterTaxonomies = extractFilterTaxonomies(layer);
      poisSelectedFilterIdentifiers = (state.poisSelectedFilterIdentifiers ?? []).filter(
        i => i.indexOf('poi_') < 0 && i.indexOf('where_') < 0,
      );
      poisSelectedFilterIdentifiers = Array.from(
        new Set([
          ...(state?.poisSelectedFilterIdentifiers ?? []),
          ...poisSelectedFilterIdentifiers,
          ...(filterTaxonomies ?? []),
        ]),
      );
    }

    const newState: UserActivityState = {
      ...state,
      layer,
      poisSelectedFilterIdentifiers,
      filterTaxonomies,
    };
    return newState;
  }),
  on(setLastFilterType, (state, lastFilterType) => {
    return {...state, ...{lastFilterType: lastFilterType.filter}};
  }),
  on(toggleTrackFilter, (state, {filter}) => {
    let newSelectedFilters = [...(state.filterTracks ?? [])];
    if (newSelectedFilters.map(f => f.identifier).indexOf(filter.identifier) >= 0) {
      newSelectedFilters = state.filterTracks.filter(f => f.identifier != filter.identifier);
    } else {
      newSelectedFilters.push(filter);
    }
    const newState: UserActivityState = {
      ...state,
      filterTracks: newSelectedFilters,
    };
    return newState;
  }),
  on(updateTrackFilter, (state, {filter}) => {
    let newSelectedFilters = [...(state.filterTracks ?? [])];
    if (newSelectedFilters.map(f => f.identifier).indexOf(filter.identifier) >= 0) {
      newSelectedFilters = state.filterTracks.filter(f => f.identifier != filter.identifier);
      newSelectedFilters.push(filter);
    } else {
      newSelectedFilters.push(filter);
    }
    const newState: UserActivityState = {
      ...state,
      filterTracks: newSelectedFilters,
    };
    return newState;
  }),
  on(applyWhere, (state, {where}) => {
    let poisSelectedFilterIdentifiers = (state.poisSelectedFilterIdentifiers ?? []).filter(
      i => i.indexOf('poi_') < 0,
    );
    poisSelectedFilterIdentifiers = [...poisSelectedFilterIdentifiers, ...(where ?? [])];

    const newState: UserActivityState = {
      ...state,
      filterTaxonomies: where,
      poisSelectedFilterIdentifiers,
    };
    return newState;
  }),
  on(togglePoiFilter, (state, {filterIdentifier}) => {
    let newSelectedFilterIdentifiers = [...(state.poisSelectedFilterIdentifiers ?? [])];
    if (newSelectedFilterIdentifiers.indexOf(filterIdentifier) >= 0) {
      newSelectedFilterIdentifiers = state.poisSelectedFilterIdentifiers.filter(
        f => f != filterIdentifier,
      );
    } else {
      newSelectedFilterIdentifiers.push(filterIdentifier);
    }

    const newState: UserActivityState = {
      ...state,
      poisSelectedFilterIdentifiers: newSelectedFilterIdentifiers,
    };
    return newState;
  }),
  on(resetPoiFilters, (state, {}) => {
    const newState: UserActivityState = {
      ...state,
      poisSelectedFilterIdentifiers: [],
    };
    return newState;
  }),
  on(startLoader, (state, {identifier}) => {
    const loading = {...state.loading, [identifier]: true};
    const newState: UserActivityState = {
      ...state,
      loading,
    };
    return newState;
  }),
  on(stopLoader, (state, {identifier}) => {
    const loading = {...state.loading, [identifier]: false};
    const newState: UserActivityState = {
      ...state,
      loading,
    };
    return newState;
  }),
  on(trackElevationChartHoverElemenents, (state, {elements}) => {
    const newState: UserActivityState = {
      ...state,
      chartHoverElements: elements,
    };
    return newState;
  }),
  on(currentEcPoiId, (state, {currentEcPoiId}) => {
    const newState: UserActivityState = {
      ...state,
      currentEcPoiId,
    };
    return newState;
  }),
  on(wmMapHitMapChangeFeatureById, (state, {id}) => {
    const newState: UserActivityState = {
      ...state,
      wmMapHitMapChangeFeatureById: id,
    };
    return newState;
  }),
  on(loadHitmapFeaturesSuccess, (state, {wmMapHitmapFeatures}) => {
    return {
      ...state,
      wmMapHitmapFeatures,
    };
  }),

  on(wmMapFeaturesInViewportSuccess, (state, {featuresInViewport}) => {
    const newState: UserActivityState = {
      ...state,
      featuresInViewport,
    };
    return newState;
  }),
);
