import {createFeatureSelector, createSelector} from '@ngrx/store';

import {confFeatureKey} from './pois.reducer';
import {confPoisIcons} from '../conf/conf.selector';
import {FeatureCollection} from 'geojson';

export const poisFeature = createFeatureSelector<{
  featureCollection: FeatureCollection;
  featureCollectionCount: number;
  stats: {
    [name: string]: {[identifier: string]: any};
  };
  where: string[] | null;
  filters: string[] | null;
}>(confFeatureKey);
export const pois = createSelector(poisFeature, confPoisIcons, (state, icons) => {
  let s = state.featureCollection;
  if (s != null && s.features != null && icons != null) {
    const iconKeys = Object.keys(icons);
    const features = s.features.map(f => {
      if (f != null && f.properties != null && f.properties.taxonomyIdentifiers != null) {
        const filteredArray = f.properties.taxonomyIdentifiers.filter(value =>
          iconKeys.includes(value),
        );
        if (filteredArray.length > 0) {
          let p = {...f.properties, ...{svgIcon: icons[filteredArray[0]]}};

          return {...f, ...{properties: p}};
        }
      }
      return f;
    });
    return {...s, ...{features: features}};
  }
  return s;
});
export const stats = createSelector(poisFeature, state => state.stats);
export const featureCollectionCount = createSelector(
  poisFeature,
  state => state.featureCollectionCount,
);
export const featureCollection = createSelector(poisFeature, state => state.featureCollection);
export const showPoisResult = createSelector(
  poisFeature,
  state => state.where != null || state.filters != null,
);
