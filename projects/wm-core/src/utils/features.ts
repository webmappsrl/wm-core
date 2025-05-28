import {WmFeature} from "@wm-types/feature";
import {LineString, Point} from "geojson";

//TODO: spostare in wm-types
export function isValidWmFeature(data: WmFeature<LineString | Point>): boolean {
  return (
    data &&
    data.type === 'Feature' &&
    data.geometry &&
    (data.geometry.type === 'LineString' || data.geometry.type === 'Point') &&
    Array.isArray(data.geometry.coordinates) &&
    data.geometry.coordinates.length > 0
  );
}