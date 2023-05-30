import {createAction, props} from '@ngrx/store';
import {FeatureCollection} from 'geojson';

export const loadPois = createAction('[pois] Load pois');
export const loadPoisSuccess = createAction(
  '[pois] Load pois Success',
  props<{featureCollection: FeatureCollection}>(),
);
export const loadPoisFail = createAction('[pois] Load pois Fail');
export const applyWhere = createAction('[pois] apply where', props<{where: string[]}>());
export const togglePoiFilter = createAction(
  '[pois] toggle filter',
  props<{filterIdentifier: string}>(),
);
