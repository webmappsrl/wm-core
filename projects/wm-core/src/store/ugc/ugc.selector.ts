import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {UgcState} from '@wm-core/store/ugc/ugc.reducer';
import {confAUTHEnable} from '@wm-core/store/conf/conf.selector';

export const ugc = createFeatureSelector<UgcState>('ugc');

export const syncing = createSelector(ugc, state => state.syncing);

export const activableUgc = createSelector(
  confAUTHEnable,
  isLogged,
  (authEnable, isLogged) => authEnable && isLogged,
);
export const opened = createSelector(ugc, (state: UgcState) => state.opened);
export const ugcTracks = createSelector(ugc, (state: UgcState) => state.ugcTracks);
export const ugcPoisFeatures = createSelector(ugc, (state: UgcState) => state.ugcPoiFeatures);
export const ugcTracksFeatures = createSelector(ugc, (state: UgcState) => state.ugcTrackFeatures);
export const countUgcTracks = createSelector(ugc, (state: UgcState) => state.ugcTracks.length ?? 0);
