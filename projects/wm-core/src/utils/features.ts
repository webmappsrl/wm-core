import {WmFeature} from "@wm-types/feature";
import {LineString, Point} from "geojson";

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