import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { IGeojsonCluster, IGeojsonPoi, iLocalString } from "./model";

export interface iMarker {
  icon: Feature<Geometry>,
  id: string
}
export interface ClusterMarker extends iMarker {
  cluster: IGeojsonCluster
}

export interface PoiMarker extends iMarker {
  poi: IGeojsonPoi
}

export interface MapMoveEvent {
  boundingbox: number[];
  zoom: number;
}

export interface SearchStringResult {
  places: PlaceResult[];
  ec_tracks: TrackResult[];
  poi_types: FilterResult[];
}

export interface PlaceResult {

  "id": number,
  "name": iLocalString,
  "bbox": number[]

}
export interface TrackResult {
  "id": number,
  "image": string,
  "name": iLocalString,
  "where": number[]
}
export interface FilterResult {
  "id": number,
  "name": iLocalString
}