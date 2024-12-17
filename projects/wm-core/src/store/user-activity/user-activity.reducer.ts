import {createReducer, on} from '@ngrx/store';
import {ILAYER, Filter} from '@wm-core/types/config';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {
  applyWhere,
  closeUgc,
  enabledDrawTrack,
  goToHome,
  inputTyped,
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
} from './user-activity.action';

export const key = 'userActivity';
export interface UserActivityState {
  ugcOpened: boolean;
  inputTyped?: string;
  filterTracks: Filter[];
  filterTaxonomies: any[];
  currentLayer?: ILAYER;
  currentPoi?: WmFeature<Point>;
  currentFilters?: any[];
  poisSelectedFilterIdentifiers?: string[];
  drawTrack: boolean;
  layer?: any;
  lastFilterType?: 'tracks' | 'pois' | null;
  loading: boolean;
}

export interface UserAcitivityRootState {
  [key]: UserActivityState;
}

const initialState: UserActivityState = {
  ugcOpened: false,
  inputTyped: null,
  filterTracks: [],
  drawTrack: false,
  filterTaxonomies: [],
  lastFilterType: null,
  loading: false,
};

export const userActivityReducer = createReducer(
  initialState,
  on(openUgc, state => ({...state, ugcOpened: true})),
  on(closeUgc, state => ({...state, ugcOpened: false})),
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
  on(enabledDrawTrack, (state, {drawTrack}) => {
    return {
      ...state,
      ...{drawTrack},
    };
  }),
  on(setLayer, (state, {layer}) => {
    let poisSelectedFilterIdentifiers = [];
    const filterTaxonomies = layer
      ? [
          ...(layer.taxonomy_wheres ?? [])
            .filter(t => t.identifier != null)
            .map(t => `where_${t.identifier}`),
          ...(layer.taxonomy_activities || [])
            .filter(t => t.identifier != null)
            .map(t => `${t.identifier}`),
          ...(layer.taxonomy_themes || [])
            .filter(t => t.identifier != null)
            .map(t => `${t.identifier}`),
        ]
      : null;
    if (filterTaxonomies) {
      poisSelectedFilterIdentifiers = (state.poisSelectedFilterIdentifiers ?? []).filter(
        i => i.indexOf('poi_') < 0 && i.indexOf('where_') < 0,
      );
      poisSelectedFilterIdentifiers = [
        ...poisSelectedFilterIdentifiers,
        ...(filterTaxonomies ?? []),
      ];
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
  on(startLoader, state => ({...state, loading: true})),
  on(stopLoader, state => ({...state, loading: false})),
);
