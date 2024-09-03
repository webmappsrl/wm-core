import {Feature} from 'ol';
import Geometry from 'ol/geom/Geometry';
import { EGeojsonGeometryTypes } from 'wm-core/types/egeojson-geometry-types.enum';
import { IGeojsonFeature, IGeojsonGeometry, IGeojsonProperties } from 'wm-core/types/model';

export interface IMarker {
  icon: Feature<Geometry>;
  id: string;
}

export interface IPoiMarker extends IMarker {
  poi: IGeojsonFeature;
}

export abstract class CGeojsonFeature implements IGeojsonFeature {
  protected _geometry: IGeojsonGeometry;
  protected _properties: IGeojsonProperties;

  readonly type = 'Feature';

  get geojson(): IGeojsonFeature {
    return {
      type: this.type,
      properties: this.properties,
      geometry: this.geometry,
    };
  }

  get geometry(): IGeojsonGeometry {
    return this?._geometry;
  }

  get geometryType(): EGeojsonGeometryTypes {
    return this?._geometry?.type;
  }

  get id(): number {
    return this?._properties?.id;
  }

  get properties(): IGeojsonProperties {
    return this?._properties;
  }

  constructor() {
    this._properties = {
      id: null,
    };
  }

  addProperties(properties: any): void {
    if (typeof properties === 'string') {
      properties = JSON.parse(properties);
    }
    this._properties = {...this._properties, ...properties};
  }

  setProperty(property: string, value: any): void {
    this._properties[property] = value;
  }

  abstract setGeometry(geometry: IGeojsonGeometry): void;
}
