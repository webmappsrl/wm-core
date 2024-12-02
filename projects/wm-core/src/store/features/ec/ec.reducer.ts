import {FeatureCollection, Point} from 'geojson';
import {createReducer, on} from '@ngrx/store';
import {
  applyWhere,
  loadEcPoisSuccess,
  queryEcFail,
  queryEcSuccess,
  resetPoiFilters,
  setLayer,
  togglePoiFilter,
  toggleTrackFilter,
  updateTrackFilter,
  goToHome,
  setLastFilterType,
} from '@wm-core/store/features/ec/ec.actions';
import {Filter} from '@wm-core/types/config';
import {IHIT} from '@wm-core/types/elastic';

export const searchKey = 'search';
export interface Ec {
  filterTracks: Filter[];
  layer?: any;
  poisInitFeatureCollection?: FeatureCollection;
  poisSelectedFilterIdentifiers?: string[];
  filterTaxonomies?: string[];
  goToHome: boolean;
  hits?: IHIT[];
  aggregations?: any;
  syncing: boolean;
}
export interface ApiRootState {
  [searchKey]: Ec;
}

const initialConfState: Ec = {
  filterTracks: [],
  layer: null,
  poisInitFeatureCollection: null,
  poisSelectedFilterIdentifiers: null,
  filterTaxonomies: [],
  goToHome: false,
  hits: [],
  syncing: false,
};

export const ecReducer = createReducer(
  initialConfState,

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
        i => i.indexOf('poi_') < 0 && i.indexOf('where_') < 0,
      );
      poisSelectedFilterIdentifiers = [
        ...poisSelectedFilterIdentifiers,
        ...(filterTaxonomies ?? []),
      ];
    }
    const newState: Ec = {
      ...state,
      layer,
      poisSelectedFilterIdentifiers,
      filterTaxonomies,
    };
    return newState;
  }),
  on(queryEcSuccess, (state, {response}) => {
    const newState: Ec = {
      ...state,
      hits: response.hits,
      aggregations: response.aggregations,
    };
    return newState;
  }),
  on(queryEcFail, state => state),
  on(toggleTrackFilter, (state, {filter}) => {
    let newSelectedFilters = [...(state.filterTracks ?? [])];
    if (newSelectedFilters.map(f => f.identifier).indexOf(filter.identifier) >= 0) {
      newSelectedFilters = state.filterTracks.filter(f => f.identifier != filter.identifier);
    } else {
      newSelectedFilters.push(filter);
    }
    const newState: Ec = {
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
    const newState: Ec = {
      ...state,
      filterTracks: newSelectedFilters,
    };
    return newState;
  }),
  on(loadEcPoisSuccess, (state, {featureCollection}) => {
    const newState: Ec = {
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

    const newState: Ec = {
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

    const newState: Ec = {
      ...state,
      poisSelectedFilterIdentifiers: newSelectedFilterIdentifiers,
    };
    return newState;
  }),
  on(resetPoiFilters, (state, {}) => {
    const newState: Ec = {
      ...state,
      poisSelectedFilterIdentifiers: [],
    };
    return newState;
  }),
  on(goToHome, (state, {}) => {
    const newState: Ec = {
      ...state,
      goToHome: !state.goToHome,
    };
    return newState;
  }),
);
