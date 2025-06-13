import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';

//TODO: spostare in wm-types
export function isValidWmFeature(feature: WmFeature<LineString | Point>): boolean {
  return (
    feature &&
    feature.type === 'Feature' &&
    feature.geometry &&
    (feature.geometry.type === 'LineString' || feature.geometry.type === 'Point') &&
    Array.isArray(feature.geometry.coordinates) &&
    feature.geometry.coordinates.length > 0
  );
}

export function areFeatureGeometriesEqual(
  feature1: WmFeature<LineString | Point>,
  feature2: WmFeature<LineString | Point>,
): boolean {
  if (!isValidWmFeature(feature1) || !isValidWmFeature(feature2)) {
    return false;
  }

  if (feature1.geometry.type !== feature2.geometry.type) {
    return false;
  }

  const coords1 = feature1.geometry.coordinates;
  const coords2 = feature2.geometry.coordinates;

  if (coords1.length !== coords2.length) {
    return false;
  }

  for (let i = 0; i < coords1.length; i++) {
    const coord1 = coords1[i];
    const coord2 = coords2[i];

    // Per Point, coord1 e coord2 sono array di numeri
    // Per LineString, coord1 e coord2 sono array di array di numeri
    if (Array.isArray(coord1) && Array.isArray(coord2)) {
      if (coord1.length !== coord2.length) {
        return false;
      }
      for (let j = 0; j < coord1.length; j++) {
        if (coord1[j] !== coord2[j]) {
          return false;
        }
      }
    } else if (coord1 !== coord2) {
      return false;
    }
  }

  return true;
}
