import {Feature, FeatureCollection, Geometry} from 'geojson';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
import {
  confFILTERS,
  confFILTERSTRACKS,
  confPOISFilter,
  confPoisIcons,
} from './../conf/conf.selector';
export const elasticSearchFeature = createFeatureSelector<IELASTIC>('query');
export const queryApi = createSelector(elasticSearchFeature, (state: SearchResponse<IHIT>) =>
  state != null && state.hits && state.hits.hits ? state.hits.hits.map(hit => hit._source) : [],
);
export const apiElasticState = createSelector(elasticSearchFeature, state => {
  return {
    layer: state.layer,
    activities: state.activities,
    inputTyped: state.inputTyped,
    loading: true,
  };
});
export const apiTrackFilterIdentifier = createSelector(apiElasticState, state => {
  return state.activities;
});
export const apiSearchInputTyped = createSelector(apiElasticState, state => state.inputTyped);
export const apiTrackFilter = createSelector(
  apiTrackFilterIdentifier,
  confFILTERS,
  (activities, filters) => {
    const activityFilter =
      filters != null && filters['activity'] != null ? filters['activity'] : undefined;
    if (activities.length > 0 && activityFilter != null) {
      let opt = activityFilter.options;
      return activities.map(a => opt.filter(o => o.identifier === a)[0]);
    }
    return activities;
  },
);
export const apiElasticStateLayer = createSelector(apiElasticState, state => {
  return state.layer;
});
export const apiElasticStateLoading = createSelector(elasticSearchFeature, state => {
  return state.loading;
});
export const confFILTERSTRACKSOPTIONS = createSelector(
  confFILTERSTRACKS,
  filterTrack => filterTrack.options ?? [],
);
export const apiTrackFilters = createSelector(
  apiTrackFilterIdentifier,
  confFILTERSTRACKSOPTIONS,
  (selectedFilterIdentifiers, trackFilter) => {
    return trackFilter.filter(t => selectedFilterIdentifiers.indexOf(t.identifier) >= 0);
  },
);

export const showPoisResult = createSelector(elasticSearchFeature, state => state.where != null);
export const showResult = createSelector(elasticSearchFeature, state => {
  return (
    state.layer != null ||
    state.activities.length > 0 ||
    (state.poisSelectedFilterIdentifiers && state.poisSelectedFilterIdentifiers.length > 0) ||
    (state.inputTyped && state.inputTyped != '')
  );
});

export const poiFilterIdentifiers = createSelector(
  elasticSearchFeature,
  state => state.poisSelectedFilterIdentifiers ?? [],
);
export const poiFilters = createSelector(
  elasticSearchFeature,
  confPOISFilter,
  (state, poisFilters) => {
    let filters = [];

    if (state.poisSelectedFilterIdentifiers != null && poisFilters.poi_type != null) {
      filters = [
        ...filters,
        ...poisFilters.poi_type.filter(
          poiFilter => state.poisSelectedFilterIdentifiers.indexOf(poiFilter.identifier) >= 0,
        ),
      ];
    }
    return filters;
  },
);

export const filterWhere = createSelector(elasticSearchFeature, state => state.filterWhere);

export const poisInitFeatureCollection = createSelector(
  elasticSearchFeature,
  state => state.poisInitFeatureCollection,
);
export const poisWhereFeatureCollection = createSelector(
  poisInitFeatureCollection,
  filterWhere,
  (featureCollection, filter) => _filterFeatureCollection(featureCollection, filter),
);
export const poisFilteredFeatureCollection = createSelector(
  poisWhereFeatureCollection,
  poiFilterIdentifiers,
  (featureCollection, filter) => _filterFeatureCollection(featureCollection, filter),
);
export const poisFilteredFeatureCollectionByInputType = createSelector(
  poisFilteredFeatureCollection,
  apiSearchInputTyped,
  (featureCollection, inputTyped) =>
    _filterFeatureCollectionByInputTyped(featureCollection, inputTyped),
);
export const featureCollection = createSelector(
  poisFilteredFeatureCollectionByInputType,
  poisFilteredFeatureCollectionByInputType => poisFilteredFeatureCollectionByInputType,
);
export const pois = createSelector(featureCollection, confPoisIcons, (featureCollection, icons) => {
  let s = featureCollection;
  if (s != null && s.features != null && icons != null) {
    const iconKeys = Object.keys(icons);
    const features = s.features.map(f => {
      if (f != null && f.properties != null && f.properties.taxonomyIdentifiers != null) {
        const filteredArray = f.properties.taxonomyIdentifiers.filter(value =>
          iconKeys.includes(value),
        );
        if (filteredArray.length > 0) {
          let p = {...f.properties, ...{svgIcon: icons[filteredArray[0]]}};

          return {...f, ...{properties: p}};
        }
      }
      return f;
    });
    return {...s, ...{features: features}};
  }
  return s;
});
export const featureCollectionCount = createSelector(
  featureCollection,
  featureCollection => featureCollection?.features?.length,
);
export const poisInitStats = createSelector(poisInitFeatureCollection, poisInitFeatureCollection =>
  _buildStats(poisInitFeatureCollection.features),
);
export const poisWhereStats = createSelector(
  poisWhereFeatureCollection,
  poisWhereFeatureCollection => _buildStats(poisWhereFeatureCollection.features),
);
export const poisFiltersStats = createSelector(
  poisFilteredFeatureCollection,
  poisFilteredFeatureCollection => _buildStats(poisFilteredFeatureCollection.features),
);
export const poisFilteredFeatureCollectionByInputTypeStats = createSelector(
  poisFilteredFeatureCollectionByInputType,
  poisFilteredFeatureCollectionByInputType =>
    _buildStats(poisFilteredFeatureCollectionByInputType?.features),
);
export const stats = createSelector(
  poisFilteredFeatureCollectionByInputTypeStats,
  poisFilteredFeatureCollectionByInputTypeStats => poisFilteredFeatureCollectionByInputTypeStats,
);
export const hasActiveFilters = createSelector(
  apiTrackFilters,
  poiFilters,
  showPoisResult,
  (apiTrackFilters, poiFilters, showPoisResult) => {
    return apiTrackFilters.length > 0 || poiFilters.length > 0 || showPoisResult;
  },
);

const _filterFeatureCollection = (
  featureCollection: FeatureCollection,
  filters: string[],
): FeatureCollection => {
  if (filters == null || filters.length === 0 || featureCollection?.features == null)
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
const _buildStats = (
  features: Feature<
    Geometry,
    {
      [name: string]: {[identifier: string]: any};
    }
  >[],
) => {
  if (features == null) return {};
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
const _filterFeatureCollectionByInputTyped = (
  featureCollection: FeatureCollection,
  inputTyped: string,
): FeatureCollection => {
  if (inputTyped == null || inputTyped == '' || featureCollection == null) {
    return featureCollection;
  }
  return {
    type: 'FeatureCollection',
    features: featureCollection.features.filter(feature => {
      const p = feature?.properties;
      const searchable = `${JSON.stringify(p?.name ?? '')}${p?.searchable ?? ''}`;
      return searchable.toLowerCase().indexOf(inputTyped.toLocaleLowerCase()) >= 0;
    }),
  } as FeatureCollection;
};
