import {createSelector} from '@ngrx/store';
import {ugcOpened} from '../user-activity/user-activity.selector';
import {
  countEcAll,
  countEcPois,
  countEcTracks,
  currentEcTrack,
  ecPois,
  ecTracks,
} from './ec/ec.selector';
import {
  countUgcAll,
  countUgcPois,
  countUgcTracks,
  currentUgcTrack,
  ugcPoiFeatures,
  ugcTracks,
} from './ugc/ugc.selector';

export const countAll = createSelector(countEcAll, countUgcAll, ugcOpened, (ec, ugc, ugcOpened) =>
  ugcOpened ? ugc : ec,
);
export const countPois = createSelector(
  countEcPois,
  countUgcPois,
  ugcOpened,
  (ec, ugc, ugcOpened) => (ugcOpened ? ugc : ec),
);
export const countTracks = createSelector(
  countEcTracks,
  countUgcTracks,
  ugcOpened,
  (ec, ugc, ugcOpened) => (ugcOpened ? ugc : ec),
);

export const tracks = createSelector(ecTracks, ugcTracks, ugcOpened, (ec, ugc, ugcOpened) =>
  ugcOpened ? ugc : ec,
);
export const pois = createSelector(ecPois, ugcPoiFeatures, ugcOpened, (ec, ugc, ugcOpened) => {
  return ugcOpened ? ugc : ec;
});

export const track = createSelector(
  currentEcTrack,
  currentUgcTrack,
  ugcOpened,
  (ec, ugc, ugcOpened) => {
    return ugcOpened ? ugc : ec;
  },
);
