import {Feature, FeatureCollection, Geometry} from 'geojson';
import {createReducer, on} from '@ngrx/store';
import {
  applyWhere,
  inputTyped,
  loadPoisSuccess,
  queryApiFail,
  queryApiSuccess,
  resetActivities,
  resetPoiFilters,
  setLayer,
  togglePoiFilter,
  toggleTrackFilter,
} from './api.actions';

export const searchKey = 'search';
export interface Api {
  activities: string[];
  loading: boolean;
  poisInitStats: {[key: string]: number};
  poisWhereStats: {[key: string]: number};
  poisStats: {[key: string]: number};
  poisFeatureCollectionCount: number;
  layer?: any;
  inputTyped?: string;
  selectedFilterIdentifiers?: string[];
  poisInitFeatureCollection?: FeatureCollection;
  poisWhereFeatureCollection?: FeatureCollection;
  poisFeatureCollection?: FeatureCollection;
  poisWhere?: string[];
  poisSelectedFilterIdentifiers?: string[];
}
export interface ApiRootState {
  [searchKey]: Api;
}

const initialConfState: Api = {
  activities: [],
  layer: null,
  loading: true,
  inputTyped: null,
  selectedFilterIdentifiers: null,
  poisInitFeatureCollection: null,
  poisWhereFeatureCollection: null,
  poisFeatureCollection: null,
  poisFeatureCollectionCount: 0,
  poisInitStats: {},
  poisWhereStats: {},
  poisStats: {},
  poisWhere: null,
  poisSelectedFilterIdentifiers: null,
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
  on(resetActivities, (state, {}) => {
    const newState: Api = {
      ...state,
      activities: [],
      selectedFilterIdentifiers: [],
      loading: true,
    };
    return newState;
  }),
  on(setLayer, (state, {layer}) => {
    const newState: Api = {...state, layer, loading: true};
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
  on(toggleTrackFilter, (state, {filterIdentifier}) => {
    let newSelectedFilterIdentifiers = [...(state.selectedFilterIdentifiers ?? [])];
    if (newSelectedFilterIdentifiers.indexOf(filterIdentifier) >= 0) {
      newSelectedFilterIdentifiers = state.selectedFilterIdentifiers.filter(
        f => f != filterIdentifier,
      );
    } else {
      newSelectedFilterIdentifiers.push(filterIdentifier);
    }
    const newState: Api = {
      ...state,
      activities: newSelectedFilterIdentifiers,
      selectedFilterIdentifiers: newSelectedFilterIdentifiers,
      loading: true,
    };
    return newState;
  }),
  on(loadPoisSuccess, (state, {featureCollection}) => {
    const poisInitStats = _buildStats(featureCollection.features);
    const newState: Api = {
      ...state,
      poisInitFeatureCollection: featureCollection,
      poisWhereFeatureCollection: featureCollection,
      poisFeatureCollection: featureCollection,
      poisFeatureCollectionCount: featureCollection.features.length,
      poisInitStats,
      poisWhereStats: poisInitStats,
      poisStats: poisInitStats,
    };
    return newState;
  }),
  on(applyWhere, (state, {where}) => {
    let poisSelectedFilterIdentifiers = (state.poisSelectedFilterIdentifiers ?? []).filter(
      i => i.indexOf('poi_') < 0,
    );
    poisSelectedFilterIdentifiers = [...poisSelectedFilterIdentifiers, ...(where ?? [])];
    const poisWhereFeatureCollection = _filterFeatureCollection(
      state.poisInitFeatureCollection,
      where,
    );
    const poisWhereStats = _buildStats(poisWhereFeatureCollection.features);
    const poisFeatureCollection = _filterFeatureCollection(
      poisWhereFeatureCollection,
      state.selectedFilterIdentifiers,
    );
    const poisStats = _buildStats(poisFeatureCollection.features);
    const newState: Api = {
      ...state,
      poisWhereFeatureCollection,
      poisWhereStats,
      poisWhere: where,
      poisFeatureCollection,
      poisFeatureCollectionCount: poisFeatureCollection.features.length,
      poisSelectedFilterIdentifiers,
      poisStats,
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

    const poisFeatureCollection = _filterFeatureCollection(
      state.poisWhereFeatureCollection,
      newSelectedFilterIdentifiers,
    );
    const poisStats = _buildStats(poisFeatureCollection.features);
    const newState: Api = {
      ...state,
      poisFeatureCollection,
      poisFeatureCollectionCount: poisFeatureCollection.features.length,
      poisStats,
      poisSelectedFilterIdentifiers: newSelectedFilterIdentifiers,
    };
    return newState;
  }),
  on(resetPoiFilters, (state, {}) => {
    const newState: Api = {
      ...state,
      poisFeatureCollection: state.poisInitFeatureCollection,
      poisWhereFeatureCollection: state.poisInitFeatureCollection,
      poisFeatureCollectionCount: state.poisInitFeatureCollection.features.length,
      poisWhereStats: state.poisInitStats,
      poisStats: state.poisInitStats,
      poisSelectedFilterIdentifiers: [],
    };
    return newState;
  }),
);

const _buildStats = (
  features: Feature<
    Geometry,
    {
      [name: string]: {[identifier: string]: any};
    }
  >[],
) => {
  const stats: {[identifier: string]: any} = {};
  features.forEach(feature => {
    const taxonomyIdentifiers = feature?.properties?.taxonomyIdentifiers || [];
    taxonomyIdentifiers.forEach(taxonomyIdentifier => {
      stats[taxonomyIdentifier] =
        stats[taxonomyIdentifier] != null ? stats[taxonomyIdentifier] + 1 : 1;
    });
  });
  return stats;
};

const _filterFeatureCollection = (
  featureCollection: FeatureCollection,
  filters: string[],
): FeatureCollection => {
  if (filters == null || filters.length === 0 || featureCollection.features == null)
    return featureCollection;
  return {
    type: 'FeatureCollection',
    features: featureCollection.features.filter(feature => {
      const taxonomyIdentifiers = feature?.properties?.taxonomyIdentifiers || [];
      return isArrayContained(filters, taxonomyIdentifiers);
    }),
  } as FeatureCollection;
};

const isArrayContained = (needle: any[], haystack: any[]): boolean => {
  if (needle.length > haystack.length) return false;
  return needle.every(element => haystack.includes(element));
};

const toggleValue = (array: string[] = [], elem: string): string[] => {
  let newArray = [...(array ?? [])];
  if (newArray.indexOf(elem) >= 0) {
    newArray = newArray.filter(f => f != elem);
  } else {
    newArray.push(elem);
  }
  return newArray;
};
