import {EGeojsonGeometryTypes} from './egeojson-geometry-types.enum';

export type IPoint = [number, number, number?];
export type ILineString = Array<IPoint>;
export type IMultiLineString = Array<Array<IPoint>>;
export type IPolygon = Array<Array<IPoint>>;
export type IMultiPolygon = Array<Array<Array<IPoint>>>;

/**
 * Define the supported geometries
 */
interface IGeojsonGeometry {
  coordinates: IPoint | ILineString | IMultiLineString | IPolygon | IMultiPolygon;
  type: EGeojsonGeometryTypes;
}

interface iLocalString {
  en?: string;
  it?: string;

  [key: string]: string;
}

/**
 * Define the supported properties
 */
interface IGeojsonProperties {
  ascent?: number;
  audio?: {[lang: string]: string};
  created_at?: Date;
  descent?: number;
  description?: iLocalString;
  difficulty?: iLocalString;
  distance?: number;
  distance_comp?: number;
  duration?: {
    hiking?: {
      forward?: number;
      backward?: number;
    };
  };
  duration_backward?: number;
  duration_forward?: number;
  ele_from?: number;
  ele_max?: number;
  ele_min?: number;
  ele_to?: number;
  excerpt?: iLocalString;
  feature_image?: IWmImage;
  geojson_url?: string;
  gpx_url?: string;
  // allow to work with custom properties when needed
  id: number;
  image?: IWmImage;
  image_gallery?: IWmImage[];
  import_method?: string;
  kml_url?: string;
  mbtiles?: string[];
  name?: iLocalString;
  source?: string;
  source_id?: string;
  taxonomy?: {
    activity?: any[];
    where?: string[];
    poi_type?: any;
  };
  updated_at?: Date;
  user_id?: number;

  [_: string]: any;
}

/**
 * Define a feature
 */
interface IGeojsonFeature {
  geometry: IGeojsonGeometry;
  properties: IGeojsonProperties;
  type: 'Feature';
}

interface IGeojsonFeatureDownloaded extends IGeojsonFeature {
  size: number;
}

interface IWmImage {
  api_url: string;
  caption: string;
  id: number;
  sizes: {
    '108x148': string;
    '108x137': string;
    '225x100': string;
    '250x150': string;
    '118x138': string;
    '108x139': string;
    '118x117': string;
    '335x250': string;
    '400x200': string;
    '1440x500': string;
  };
  url: string;
}

interface IGeojsonGeneric {
  geometry: IGeojsonGeometry;
  properties: any;
  type: string;
}
interface IGeojsonCluster extends IGeojsonGeneric {
  properties: {
    ids: number[]; // Id di Ec Track che fanno parte del cluster
    images: string[]; // Massimo 3 url di immagini ottimizzate
    bbox: number[]; // Extent di tutte le ec track assieme
  };
  type: 'Feature';
}

interface IGeojsonPoi extends IGeojsonGeneric {
  isSmall?: boolean;
  properties: {
    id: number; // Id del poi
    image: string; // url image
  };
  type: 'Point';
}

interface IGeojsonPoiDetailed extends IGeojsonPoi {
  properties: {
    id: number; // Id del poi
    image: string; // url image
    images: string[]; // url images
    name: iLocalString;
    description: iLocalString;
    image_gallery?: any[];
    email?: string;
    phone?: string;
    address?: string;
    url?: string;
    audio?: {[lang: string]: string};
  };
}
interface IGeojsonClusterApiResponse {
  features: IGeojsonCluster[];
}

interface PoiTypeTaxonomy {
  color: string;
  icon: string;
  id: number;
  identifier: string;
  name: iLocalString;
}
interface WhereTaxonomy {
  admin_level: number;
  created_at: Date;
  description: string;
  id: 9;
  import_method: string;
  name: iLocalString;
  source_id: number;
  updated_at: Date;

  // excerpt: null,
  // source: null,
  // user_id: null,
  // identifier: toscana,
  // icon: null,
  // color: null,
  // zindex: null,
  // feature_image: null,
  // stroke_width: null,
  // stroke_opacity: null,
  // line_dash: null,
  // min_visible_zoom: null,
  // min_size_zoom: null,
  // min_size: null,
  // max_size: null,
  // icon_zoom: null,
  // icon_size: null
}
