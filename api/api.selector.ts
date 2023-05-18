import {createFeatureSelector, createSelector} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
export const elasticSearchFeature = createFeatureSelector<IELASTIC>('query');
export const queryApi = createSelector(elasticSearchFeature, (state: SearchResponse<IHIT>) =>
  state != null && state.hits && state.hits.hits ? state.hits.hits.map(hit => hit._source) : [],
);
export const apiElasticState = createSelector(elasticSearchFeature, state => {
  return {layer: state.layer, activities: state.activities, loading: true};
});
export const apiElasticStateActivities = createSelector(apiElasticState, state => {
  return state.activities;
});
export const apiElasticStateLayer = createSelector(apiElasticState, state => {
  return state.layer;
});
export const apiElasticStateLoading = createSelector(elasticSearchFeature, state => {
  return state.loading;
});
