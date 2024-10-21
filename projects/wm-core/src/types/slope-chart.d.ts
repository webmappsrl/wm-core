import { Feature, LineString } from 'geojson';
import {Location} from './location';

export interface ISlopeChartHoverElements {
  location: Location;
  track?: Feature<LineString>;
}

export interface ISlopeChartStyle {
  backgroundColor: string;
}
