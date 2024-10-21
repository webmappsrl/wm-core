import {Feature, LineString} from 'geojson';

export interface ITrackElevationChartHoverElements {
  location: any;
  track?: Feature<LineString>;
}

export enum ETrackElevationChartSurface {
  ASPHALT = 'asphalt',
  CONCRETE = 'concrete',
  DIRT = 'dirt',
  GRASS = 'grass',
  GRAVEL = 'gravel',
  PAVED = 'paved',
  SAND = 'sand',
}
