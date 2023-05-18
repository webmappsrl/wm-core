import {createFeatureSelector, createSelector} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
export const elasticSearchFeature = createFeatureSelector<IELASTIC>('query');
export const queryApi = createSelector(elasticSearchFeature, (state: SearchResponse<IHIT>) =>
  state != null && state.hits && state.hits.hits ? state.hits.hits.map(hit => hit._source) : [],
);
export const apiElasticState = createSelector(elasticSearchFeature, state => {
  return {layerID: state.layerID, activities: state.activities};
});
export const apiElasticStateActivities = createSelector(apiElasticState, state => {
  return state.activities;
});
