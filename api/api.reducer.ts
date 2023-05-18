import {createReducer, on} from '@ngrx/store';
import {
  addActivities,
  queryApiFail,
  queryApiSuccess,
  removeActivities,
  resetActivities,
  setLayer,
} from './api.actions';

export const searchKey = 'search';
export interface IElasticSearchRootState {
  [searchKey]: IELASTIC;
}

const initialConfState: IELASTIC = {
  activities: [],
  layer: null,
  loading: true,
};

export const elasticQueryReducer = createReducer(
  initialConfState,
  on(addActivities, (state, {activities}) => {
    return {
      ...state,
      activities: [...new Set([...state.activities, ...activities])],
      loading: true,
    };
  }),
  on(removeActivities, (state, {activities}) => {
    return {
      ...state,
      activities: [...state.activities.filter(a => activities.indexOf(a) < 0)],
      loading: true,
    };
  }),
  on(resetActivities, (state, {}) => ({...state, activities: [], loading: true})),
  on(setLayer, (state, {layer}) => ({...state, layer, ...{loading: true}})),
  on(queryApiSuccess, (state, {search}) => ({...state, ...search, ...{loading: false}})),
  on(queryApiFail, state => ({...state, ...{loading: false}})),
);
