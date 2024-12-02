import {createSelector} from '@ngrx/store';
import {ugcOpened} from '../user-activity/user-activity.selector';
import {countEcAll, countEcPois, countEcTracks, featureCollection, queryEc} from './ec/ec.selector';
import {countUgcAll, countUgcPois, countUgcTracks, ugcPois, ugcTracks} from './ugc/ugc.selector';

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

export const tracks = createSelector(queryEc, ugcTracks, ugcOpened, (ec, ugc, ugcOpened) =>
  ugcOpened ? ugc : ec,
);

export const pois = createSelector(
  featureCollection,
  ugcPois,
  ugcOpened,
  (ec, ugcFeatureCollection, ugcOpened) => {
    const ugcFeaures = (ugcFeatureCollection as any).features ?? null;
    const ugc = ugcFeaures ? ugcFeaures.map(p => p.properties) : ugcFeatureCollection;

    return ugcOpened ? ugc : ec;
  },
);
