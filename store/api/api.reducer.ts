import {createReducer, on} from '@ngrx/store';
import {
  addActivities,
  inputTyped,
  queryApiFail,
  queryApiSuccess,
  removeActivities,
  resetActivities,
  setLayer,
  toggleTrackFilter,
} from './api.actions';

export const searchKey = 'search';
export interface IElasticSearchRootState {
  [searchKey]: IELASTIC;
}

const initialConfState: IELASTIC = {
  activities: [],
  layer: null,
  loading: true,
  inputTyped: null,
  selectedFilterIdentifiers: null,
};

export const elasticQueryReducer = createReducer(
  initialConfState,
  on(inputTyped, (state, {inputTyped}) => {
    return {
      ...state,
      inputTyped,
      loading: true,
    };
  }),
  on(resetActivities, (state, {}) => ({...state, activities: [], loading: true})),
  on(setLayer, (state, {layer}) => ({...state, layer, ...{loading: true}})),
  on(queryApiSuccess, (state, {search}) => ({...state, ...search, ...{loading: false}})),
  on(queryApiFail, state => ({...state, ...{loading: false}})),
  on(toggleTrackFilter, (state, {filterIdentifier}) => {
    let newSelectedFilterIdentifiers = [...(state.selectedFilterIdentifiers ?? [])];
    if (newSelectedFilterIdentifiers.indexOf(filterIdentifier) >= 0) {
      newSelectedFilterIdentifiers = state.selectedFilterIdentifiers.filter(
        f => f != filterIdentifier,
      );
    } else {
      newSelectedFilterIdentifiers.push(filterIdentifier);
    }
    return {
      ...state,
      activities: newSelectedFilterIdentifiers,
      selectedFilterIdentifiers: newSelectedFilterIdentifiers,
      loading: true,
    };
  }),
);
