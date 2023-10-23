import {EGeojsonGeometryTypes} from '../../types/egeojson-geometry-types.enum';
import {IPoint, ILineString, IGeojsonGeometry} from '../../types/model';
import {CGeojsonFeature} from './cgeojson-feature';
import {Location} from '../../types/location';
export class CGeojsonLineStringFeature extends CGeojsonFeature {
  constructor(geometry?: IGeojsonGeometry) {
    super();
    if (geometry && geometry.type === 'LineString') this._geometry = geometry;
  }

  /**
   * Add a new set of coordinates to the geometry
   *
   * @param location the new coordinates to add
   */
  addCoordinates(location: Location): void {
    if (!this._geometry) this._initializeGeometry();
    const newPoint: IPoint = [location.longitude, location.latitude];
    if (location.altitude) newPoint.push(location.altitude);
    (this._geometry.coordinates as ILineString).push(newPoint);
  }

  /**
   * Set the feature geometry
   *
   * @param geometry a LineString geometry
   */
  setGeometry(geometry: IGeojsonGeometry): void {
    if (geometry.type === 'LineString') this._geometry = geometry;
  }

  /**
   * Initialize the geometry field
   */
  private _initializeGeometry() {
    this._geometry = {
      type: EGeojsonGeometryTypes.LINE_STRING,
      coordinates: [],
    };
  }
}
