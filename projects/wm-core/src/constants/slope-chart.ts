import {ISlopeChartStyle} from '../types/slope-chart';
import {ESlopeChartSurface} from '../types/eslope-chart.enum';

export const SLOPE_CHART_SLOPE_EASY: [number, number, number] = [67, 227, 9];
export const SLOPE_CHART_SLOPE_MEDIUM_EASY: [number, number, number] = [195, 255, 0];
export const SLOPE_CHART_SLOPE_MEDIUM: [number, number, number] = [255, 239, 10];
export const SLOPE_CHART_SLOPE_MEDIUM_HARD: [number, number, number] = [255, 174, 0];
export const SLOPE_CHART_SLOPE_HARD: [number, number, number] = [196, 30, 4];

export const SLOPE_CHART_SURFACE: {
  [id in ESlopeChartSurface]: ISlopeChartStyle;
} = {
  [ESlopeChartSurface.ASPHALT]: {
    // backgroundColor: '55, 52, 60',
    backgroundColor: '220, 220, 200',
  },
  [ESlopeChartSurface.CONCRETE]: {
    // backgroundColor: '134, 130, 140',
    backgroundColor: '220, 220, 200',
  },
  [ESlopeChartSurface.DIRT]: {
    // backgroundColor: '125, 84, 62',
    backgroundColor: '220, 220, 200',
  },
  [ESlopeChartSurface.GRASS]: {
    // backgroundColor: '143, 176, 85',
    backgroundColor: '220, 220, 200',
  },
  [ESlopeChartSurface.GRAVEL]: {
    // backgroundColor: '5, 56, 85',
    backgroundColor: '220, 220, 200',
  },
  [ESlopeChartSurface.PAVED]: {
    // backgroundColor: '116, 140, 172',
    backgroundColor: '220, 220, 200',
  },
  [ESlopeChartSurface.SAND]: {
    // backgroundColor: '245, 213, 56',
    backgroundColor: '220, 220, 200',
  },
};
