import {createReducer, on} from '@ngrx/store';
import {ICONS} from '@wm-types/config';
import {addIcons, loadIconsSuccess} from './icons.actions';

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
  // icons.json vince sempre: le icone inline non sovrascrivono un nome già presente
  on(addIcons, (state, {icons}) => ({...state, icons: {...icons, ...(state.icons ?? {})}})),
  on(loadIconsSuccess, (state, {icons}) => ({...state, icons: {...(state.icons ?? {}), ...icons}})),
);
