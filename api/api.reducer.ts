import {createReducer, on} from '@ngrx/store';
import {queryApiSuccess} from './api.actions';

export const searchKey = 'search';
export interface IElasticSearchRootState {
  [searchKey]: IELASTIC;
}

const initialConfState: IELASTIC = {};

export const elasticQueryReducer = createReducer(
  initialConfState,
  on(queryApiSuccess, (state, {search}) => ({state, ...search})),
);
