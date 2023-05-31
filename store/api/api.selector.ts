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
    inputTypes: state.inputTyped,
    loading: true,
  };
});
export const apiTrackFilterIdentifier = createSelector(apiElasticState, state => {
  return state.activities;
});
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
export const pois = createSelector(elasticSearchFeature, confPoisIcons, (state, icons) => {
  let s = state.poisInitFeatureCollection;
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
export const stats = createSelector(elasticSearchFeature, state => state.poisStats);
export const featureCollectionCount = createSelector(
  elasticSearchFeature,
  state => state.poisFeatureCollectionCount,
);
export const featureCollection = createSelector(
  elasticSearchFeature,
  state => state.poisFeatureCollection,
);
export const showPoisResult = createSelector(elasticSearchFeature, state => state.where != null);

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
