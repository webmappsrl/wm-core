import {CGeojsonLineStringFeature} from '../classes/features/cgeojson-line-string-feature';
import {Location} from './location';

export interface ISlopeChartStyle {
  backgroundColor: string;
}

export interface ISlopeChartHoverElements {
  location: Location;
  track?: CGeojsonLineStringFeature;
}
