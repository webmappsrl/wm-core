import {createReducer, on} from '@ngrx/store';
import {
  addActivities,
  queryApiSuccess,
  removeActivities,
  resetActivities,
  setLayerID,
} from './api.actions';

export const searchKey = 'search';
export interface IElasticSearchRootState {
  [searchKey]: IELASTIC;
}

const initialConfState: IELASTIC = {
  activities: [],
  layerID: null,
};

export const elasticQueryReducer = createReducer(
  initialConfState,
  on(addActivities, (state, {activities}) => {
    return {
      ...state,
      activities: [...new Set([...state.activities, ...activities])],
    };
  }),
  on(removeActivities, (state, {activities}) => {
    return {
      ...state,
      activities: [...state.activities.filter(a => activities.indexOf(a) < 0)],
    };
  }),
  on(resetActivities, (state, {}) => {
    return {
      ...state,
      activities: [],
    };
  }),
  on(setLayerID, (state, {layerID}) => ({...state, layerID})),
  on(queryApiSuccess, (state, {search}) => ({...state, ...search})),
);
