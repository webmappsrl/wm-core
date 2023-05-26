import {createReducer, on} from '@ngrx/store';
import {Feature, FeatureCollection, Geometry} from 'geojson';
import {loadPoisSuccess, applyFilter, applyWhere} from './pois.actions';

export const confFeatureKey = 'pois';
export interface IpoisRootState {
  [confFeatureKey]: FeatureCollection;
}
const initialPoisState: {
  initFeatureCollection: FeatureCollection;
  whereFeatureCollection: FeatureCollection;
  featureCollection: FeatureCollection;
  featureCollectionCount: number;
  initStats: {
    [name: string]: {[identifier: string]: any};
  };
  whereStats: {
    [name: string]: {[identifier: string]: any};
  };
  stats: {
    [name: string]: {[identifier: string]: any};
  };
  where: string[];
  filters: string[];
} = {
  initFeatureCollection: null,
  whereFeatureCollection: null,
  featureCollection: null,
  featureCollectionCount: 0,
  initStats: {},
  whereStats: {},
  stats: {},
  where: null,
  filters: null,
};
export const poisReducer = createReducer(
  initialPoisState,
  on(loadPoisSuccess, (state, {featureCollection}) => {
    const initStats = _buildStats(featureCollection.features);
    return {
      ...state,
      initFeatureCollection: featureCollection,
      whereFeatureCollection: featureCollection,
      featureCollection,
      featureCollectionCount: featureCollection.features.length,
      initStats,
      whereStats: initStats,
      stats: initStats,
    };
  }),
  on(applyWhere, (state, {where}) => {
    const whereFeatureCollection = _filterFeatureCollection(state.initFeatureCollection, where);
    const whereStats = _buildStats(whereFeatureCollection.features);
    const featureCollection = _filterFeatureCollection(whereFeatureCollection, state.filters);
    const stats = _buildStats(featureCollection.features);
    console.log(where);
    return {
      ...state,
      whereFeatureCollection,
      whereStats,
      where,
      featureCollection,
      featureCollectionCount: featureCollection.features.length,
      stats,
    };
  }),
  on(applyFilter, (state, {filters}) => {
    const featureCollection = _filterFeatureCollection(state.whereFeatureCollection, filters);
    const stats = _buildStats(featureCollection.features);
    console.log(filters);
    return {
      ...state,
      featureCollection,
      featureCollectionCount: featureCollection.features.length,
      stats,
      filters: filters != null && filters.length > 0 ? filters : null,
    };
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

const _filterFeatureCollection = (featureCollection: FeatureCollection, filters: string[]) => {
  if (filters == null || filters.length === 0) return featureCollection;
  return {
    type: 'FeatureCollection',
    features: featureCollection.features.filter(feature => {
      const taxonomyIdentifiers = feature?.properties?.taxonomyIdentifiers || [];
      return isArrayContained(filters, taxonomyIdentifiers);
    }),
  } as FeatureCollection;
};

const isArrayContained = (needle: any[], haystack: any[]) => {
  if (needle.length > haystack.length) return false;
  return needle.every(element => haystack.includes(element));
};
