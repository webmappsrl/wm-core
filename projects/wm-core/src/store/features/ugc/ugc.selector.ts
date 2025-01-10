import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {confAUTHEnable} from '@wm-core/store/conf/conf.selector';
import {UgcState} from './ugc.reducer';

export const ugc = createFeatureSelector<UgcState>('ugc');

export const syncing = createSelector(ugc, state => state.syncing);

export const activableUgc = createSelector(
  confAUTHEnable,
  isLogged,
  (authEnable, isLogged) => authEnable && isLogged,
);
export const ugcTracks = createSelector(ugc, (state: UgcState) => state.ugcTracks);
export const ugcPois = createSelector(ugc, (state: UgcState) => state.ugcPois);
export const ugcPoiFeatures = createSelector(ugc, (state: UgcState) => state.ugcPoiFeatures);
export const ugcTracksFeatures = createSelector(ugc, (state: UgcState) => state.ugcTrackFeatures);
export const countUgcTracks = createSelector(
  ugc,
  (state: UgcState) => state?.ugcTracks?.length ?? 0,
);
export const countUgcPois = createSelector(
  ugc,
  (state: UgcState) => state.ugcPoiFeatures.length ?? 0,
);
export const countUgcAll = createSelector(
  countUgcTracks,
  countUgcPois,
  (tracks, pois) => tracks + pois,
);

export const currentUgcTrack = createSelector(ugc, state => state.currentUgcTrack);
export const currentUgcTrackProperties = createSelector(
  currentUgcTrack,
  track => track?.properties,
);
export const currentUgcPoi = createSelector(ugc, state => state.currentUgcPoi);
export const currentUgcPoiId = createSelector(
  currentUgcPoi,
  currentUgcPoi => currentUgcPoi?.properties?.id ?? null,
);
export const syncUgcIntervalEnabled = createSelector(
  ugc,
  (state: UgcState) => state.syncUgcIntervalEnabled,
);
export const currentCustomTrack = createSelector(
  ugc,
  (state: UgcState) => state.currentCustomTrack ?? null,
);
