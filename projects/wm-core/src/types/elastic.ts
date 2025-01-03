
export interface IELASTIC {
  [name: string]: any;
}

export interface IHIT {
  cai_scale: string;
  distance: string;
  feature_image: string | any;
  id: number | string;
  layers: number[];
  name: string;
  properties: {[key:string]:any};
  ref: string;
  size?: any;
  taxonomyActivities: any;
  taxonomyWheres: string[];
}

export interface IRESPONSE {
  aggregations:any;
  hits:IHIT[];
}
