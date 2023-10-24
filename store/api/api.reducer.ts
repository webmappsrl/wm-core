import {FeatureCollection} from 'geojson';
import {createReducer, on} from '@ngrx/store';
import {
  applyWhere,
  inputTyped,
  loadPoisSuccess,
  queryApiFail,
  queryApiSuccess,
  resetTrackFilters,
  resetPoiFilters,
  setLayer,
  togglePoiFilter,
  toggleTrackFilter,
  updateTrackFilter,
  goToHome,
  setLastFilterType,
} from './api.actions';

export const searchKey = 'search';
export interface Api {
  filterTracks: Filter[];
  loading: boolean;
  layer?: any;
  inputTyped?: string;
  poisInitFeatureCollection?: FeatureCollection;
  poisSelectedFilterIdentifiers?: string[];
  filterTaxonomies?: string[];
  goToHome: boolean;
}
export interface ApiRootState {
  [searchKey]: Api;
}

const initialConfState: Api = {
  filterTracks: [],
  layer: null,
  loading: true,
  inputTyped: null,
  poisInitFeatureCollection: null,
  poisSelectedFilterIdentifiers: null,
  filterTaxonomies: [],
  goToHome: false,
};

export const elasticQueryReducer = createReducer(
  initialConfState,
  on(inputTyped, (state, {inputTyped}) => {
    const newState: Api = {
      ...state,
      inputTyped,
      loading: true,
    };
    return newState;
  }),
  on(resetTrackFilters, (state, {}) => {
    const newState: Api = {
      ...state,
      filterTracks: [],
      loading: true,
    };
    return newState;
  }),
  on(setLastFilterType, (state, lastFilterType) => {
    return {...state, ...{lastFilterType: lastFilterType.filter}};
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
        i => i.indexOf('poi_') < 0,
      );
      poisSelectedFilterIdentifiers = [
        ...poisSelectedFilterIdentifiers,
        ...(filterTaxonomies ?? []),
      ];
    }
    const newState: Api = {
      ...state,
      layer,
      loading: true,
      poisSelectedFilterIdentifiers,
      filterTaxonomies,
    };
    return newState;
  }),
  on(queryApiSuccess, (state, {search}) => {
    const newState: Api = {...state, ...search, loading: false};
    return newState;
  }),
  on(queryApiFail, state => {
    const newState: Api = {...state, loading: false};
    return newState;
  }),
  on(toggleTrackFilter, (state, {filter}) => {
    let newSelectedFilters = [...(state.filterTracks ?? [])];
    if (newSelectedFilters.map(f => f.identifier).indexOf(filter.identifier) >= 0) {
      newSelectedFilters = state.filterTracks.filter(f => f.identifier != filter.identifier);
    } else {
      newSelectedFilters.push(filter);
    }
    const newState: Api = {
      ...state,
      filterTracks: newSelectedFilters,
      loading: true,
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
    const newState: Api = {
      ...state,
      filterTracks: newSelectedFilters,
      loading: true,
    };
    return newState;
  }),
  on(loadPoisSuccess, (state, {featureCollection}) => {
    const newState: Api = {
      ...state,
      poisInitFeatureCollection: featureCollection,
    };
    return newState;
  }),
  on(applyWhere, (state, {where}) => {
    let poisSelectedFilterIdentifiers = (state.poisSelectedFilterIdentifiers ?? []).filter(
      i => i.indexOf('poi_') < 0,
    );
    poisSelectedFilterIdentifiers = [...poisSelectedFilterIdentifiers, ...(where ?? [])];

    const newState: Api = {
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

    const newState: Api = {
      ...state,
      poisSelectedFilterIdentifiers: newSelectedFilterIdentifiers,
    };
    return newState;
  }),
  on(resetPoiFilters, (state, {}) => {
    const newState: Api = {
      ...state,
      poisSelectedFilterIdentifiers: [],
    };
    return newState;
  }),
  on(goToHome, (state, {}) => {
    const newState: Api = {
      ...state,
      goToHome: !state.goToHome,
    };
    return newState;
  }),
);
