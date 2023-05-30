import {createFeatureSelector, createSelector} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
import {confFILTERS, confFILTERSTRACKS} from './../conf/conf.selector';
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
