import {createFeatureSelector, createSelector} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
import {confFILTERSTRACKS, confPOISFilter, confPoisIcons} from './../conf/conf.selector';
import {buildStats, filterFeatureCollection} from './utils';

export const elasticSearchFeature = createFeatureSelector<IELASTIC>('query');
export const queryApi = createSelector(elasticSearchFeature, (state: SearchResponse<IHIT>) =>
  state != null && state.hits && state.hits.hits ? state.hits.hits.map(hit => hit._source) : [],
);
export const countTracks = createSelector(elasticSearchFeature, (state: SearchResponse<IHIT>) =>
  state != null && state.hits != null && state?.hits?.total && state?.hits?.total
    ? (state?.hits?.total as any)?.value
    : 0,
);
export const statsApi = createSelector(elasticSearchFeature, (state: SearchResponse<IHIT>) => {
  if (state != null && state.aggregations) {
    let res = [];
    const countKeys = Object.keys(state.aggregations).filter(k => k.indexOf('_count') < 0);
    countKeys.forEach(countKey => {
      res = [
        ...res,
        ...state.aggregations[countKey].count.buckets,
        ...[
          {
            key: countKey,
            doc_count: state.aggregations.themes.doc_count,
          },
        ],
      ];
    });
    return res;
  }
});

export const apiElasticState = createSelector(elasticSearchFeature, state => {
  return {
    layer: state.layer,
    filterTracks: state.filterTracks,
    inputTyped: state.inputTyped,
    loading: true,
  };
});
export const apiFilterTracks = createSelector(apiElasticState, state => {
  return state.filterTracks;
});
export const apiTrackFilterIdentifier = createSelector(apiFilterTracks, filterTracks => {
  return filterTracks.map(f => f.identifier);
});
export const apiSearchInputTyped = createSelector(apiElasticState, state => state.inputTyped);

export const apiElasticStateLayer = createSelector(apiElasticState, state => {
  return state.layer;
});
export const apiElasticStateLoading = createSelector(elasticSearchFeature, state => {
  return state.loading;
});
export const apiGoToHome = createSelector(elasticSearchFeature, state => {
  return state.goToHome;
});
export const confFILTERSTRACKSOPTIONS = createSelector(
  confFILTERSTRACKS,
  filterTrack => filterTrack.options ?? [],
);

export const showPoisResult = createSelector(elasticSearchFeature, state => state.where != null);
export const showResult = createSelector(elasticSearchFeature, state => {
  return (
    state.layer != null ||
    state.filterTracks.length > 0 ||
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
export const countSelectedFilters = createSelector(
  poiFilters,
  apiFilterTracks,
  (pFilters, tFilters) => pFilters.length + tFilters.length ?? 0,
);

export const filterWhere = createSelector(elasticSearchFeature, state => state.filterWhere);

export const poisInitFeatureCollection = createSelector(
  elasticSearchFeature,
  state => state.poisInitFeatureCollection,
);
export const poisWhereFeatureCollection = createSelector(
  poisInitFeatureCollection,
  filterWhere,
  (featureCollection, filter) => filterFeatureCollection(featureCollection, filter),
);
export const poisFilteredFeatureCollection = createSelector(
  poisWhereFeatureCollection,
  poiFilterIdentifiers,
  (featureCollection, filter) => filterFeatureCollection(featureCollection, filter),
);
export const poisFilteredFeatureCollectionByInputType = createSelector(
  poisFilteredFeatureCollection,
  apiSearchInputTyped,
  (featureCollection, inputTyped) =>
    filterFeatureCollectionByInputTyped(featureCollection, inputTyped),
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
export const countPois = createSelector(
  featureCollection,
  featureCollection => featureCollection?.features?.length,
);
export const countAll = createSelector(countTracks, countPois, (cTracks, cPois) => {
  const c1 = typeof cTracks === 'number' ? cTracks : 0;
  const c2 = typeof cPois === 'number' ? cPois : 0;
  return c1 + c2;
});
export const poisInitStats = createSelector(poisInitFeatureCollection, poisInitFeatureCollection =>
  buildStats(poisInitFeatureCollection.features),
);
export const trackStats = createSelector(statsApi, _statsApi => {
  const stats: {[identifier: string]: any} = {};
  if (_statsApi) {
    _statsApi.forEach(element => {
      stats[element.key] = element.doc_count;
    });
  }
  return stats;
});
export const poisWhereStats = createSelector(
  poisWhereFeatureCollection,
  poisWhereFeatureCollection => buildStats(poisWhereFeatureCollection.features),
);
export const poisFiltersStats = createSelector(
  poisFilteredFeatureCollection,
  poisFilteredFeatureCollection => buildStats(poisFilteredFeatureCollection.features),
);
export const poisFilteredFeatureCollectionByInputTypeStats = createSelector(
  poisFilteredFeatureCollectionByInputType,
  poisFilteredFeatureCollectionByInputType =>
    buildStats(poisFilteredFeatureCollectionByInputType?.features),
);
export const poisStats = createSelector(
  poisFilteredFeatureCollectionByInputTypeStats,
  poisFilteredFeatureCollectionByInputTypeStats => poisFilteredFeatureCollectionByInputTypeStats,
);
export const hasActiveFilters = createSelector(
  apiFilterTracks,
  poiFilters,
  showPoisResult,
  (apiFilterTracks, poiFilters, showPoisResult) => {
    return apiFilterTracks.length > 0 || poiFilters.length > 0 || showPoisResult;
  },
);
function filterFeatureCollectionByInputTyped(featureCollection: any, inputTyped: any): any {
  throw new Error('Function not implemented.');
}
