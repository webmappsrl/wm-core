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
  start?: number[];
  end?: number[];
  distanceFromCurrentLocation?: number;
}

export interface IBucket {
  key: string | number;
  doc_count: number;
}

export interface ICount {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: IBucket[];
}

export interface IAggregationDetail {
  doc_count: number;
  count: ICount;
}

export interface IAggregations {
  themes: IAggregationDetail;
  activities: IAggregationDetail;
  layers: IAggregationDetail;
}

export interface IRESPONSE {
  aggregations: IAggregations;
  hits:IHIT[];
}
