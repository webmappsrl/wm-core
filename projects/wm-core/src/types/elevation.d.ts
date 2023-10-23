export interface ITrackElevationChartHoverElements {
  location: any;
  track?: CGeojsonLineStringFeature;
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
