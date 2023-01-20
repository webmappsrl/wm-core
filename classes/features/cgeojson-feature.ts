import { EGeojsonGeometryTypes } from 'src/app/types/egeojson-geometry-types.enum';
import {Feature} from 'ol';
import Geometry from 'ol/geom/Geometry';
import {
  IGeojsonFeature,
  IGeojsonGeometry,
  IGeojsonProperties,
} from 'src/app/types/model';

export abstract class CGeojsonFeature implements IGeojsonFeature {
  readonly type = 'Feature';
  protected _properties: IGeojsonProperties;
  protected _geometry: IGeojsonGeometry;

  constructor() {
    this._properties = {
      id: null,
    };
  }

  get properties(): IGeojsonProperties {
    return this?._properties;
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

  get geojson(): IGeojsonFeature {
    return {
      type: this.type,
      properties: this.properties,
      geometry: this.geometry,
    };
  }

  abstract setGeometry(geometry: IGeojsonGeometry): void;

  setProperty(property: string, value: any): void {
    this._properties[property] = value;
  }
}

export interface IMarker {
  icon: Feature<Geometry>;
  id: string;
}

export interface IPoiMarker extends IMarker {
  poi: IGeojsonFeature;
}
