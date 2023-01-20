import { CGeojsonLineStringFeature } from '../classes/features/cgeojson-line-string-feature';
import { ILocation } from './location';

export interface ISlopeChartStyle {
  backgroundColor: string;
}

export interface ISlopeChartHoverElements {
  location: ILocation;
  track?: CGeojsonLineStringFeature;
}
