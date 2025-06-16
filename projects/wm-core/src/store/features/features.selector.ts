import {createSelector} from '@ngrx/store';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {currentLocation, ecLayer, ugcOpened} from '../user-activity/user-activity.selector';
import {
  countEcAll,
  countEcPois,
  countEcTracks,
  currentEcPoi,
  currentEcRelatedPoi,
  currentEcTrack,
  ecPois,
  ecTracks,
} from './ec/ec.selector';
import {
  countUgcAll,
  countUgcPois,
  countUgcTracks,
  currentUgcPoi,
  currentUgcTrack,
  ugcPoiFeatures,
  ugcTracks,
} from './ugc/ugc.selector';
import {GeoJSON} from 'ol/format';

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
  return (ugcOpened ? ugc : ec) as WmFeature<Point>[];
});

export const track = createSelector(
  currentEcTrack,
  currentUgcTrack,
  ugcOpened,
  (ec, ugc, ugcOpened) => {
    return ugcOpened ? ugc : ec;
  },
);
export const poi = createSelector(
  currentEcPoi,
  currentEcRelatedPoi,
  currentUgcPoi,
  ugcOpened,
  (ecPoi, ecRelatedPoi, ugcPoi, ugcOpened) => {
    let poi = ecPoi ?? ecRelatedPoi;
    return ugcOpened ? ugcPoi : poi;
  },
);
export const poiProperties = createSelector(poi, poi => {
  return poi?.properties;
});
export const featureOpened = createSelector(track, poi, (track, poi) => {
  return track != null || poi != null;
});
export const trackFirstCoordinates = createSelector(
  track,
  currentLocation,
  (track, currentLocation) => {
    const geometry = track?.geometry;
    if(!geometry) return null;

    if(!currentLocation) return geometry.coordinates?.[0] ?? null;

    const currentCoord: [number, number] = [currentLocation.longitude, currentLocation.latitude];
    const format = new GeoJSON();
    const geometryOl = format.readGeometry(geometry);

    return geometryOl.getClosestPoint(currentCoord);
  },
);
export const poiFirstCoordinates = createSelector(
  poi,
  poi => poi?.geometry?.coordinates ?? null,
);
export const featureFirstCoordinates = createSelector(
  trackFirstCoordinates,
  poiFirstCoordinates,
  (trackFirstCoordinates, poiFirstCoordinates) => trackFirstCoordinates ?? poiFirstCoordinates,
);
export const showFeaturesInViewport = createSelector(
  featureOpened,
  ecLayer,
  (featureOpened, ecLayer) => {
    return featureOpened == false && ecLayer == null;
  },
);
