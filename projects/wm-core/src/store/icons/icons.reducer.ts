import {createReducer, on} from '@ngrx/store';
import {ICONS} from '@wm-types/config';
import {loadIconsSuccess} from './icons.actions';

export const IconsFeatureKey = 'icons';

export interface IconsState {
  icons?: ICONS;
}

export interface ApiRootState {
  [IconsFeatureKey]: IconsState;
}

export const initialState: IconsState = {
  icons: null,
};

export const iconsReducer = createReducer(
  initialState,
  on(loadIconsSuccess, (state, {icons}) => ({...state, icons})),
);
