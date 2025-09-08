import {createFeatureSelector, createSelector} from '@ngrx/store';
import {IconsFeatureKey, IconsState} from './icons.reducer';

const iconsFeature = createFeatureSelector<IconsState>(IconsFeatureKey);

export const icons = createSelector(iconsFeature, state => state.icons);
