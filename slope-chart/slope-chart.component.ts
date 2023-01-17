import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {Chart, ChartDataset, registerables, Tick, TooltipItem, TooltipModel} from 'chart.js';
import {CLocation} from 'src/app/classes/clocation';
import {CGeojsonLineStringFeature} from 'src/app/classes/features/cgeojson-line-string-feature';
import {
  SLOPE_CHART_SLOPE_EASY,
  SLOPE_CHART_SLOPE_HARD,
  SLOPE_CHART_SLOPE_MEDIUM,
  SLOPE_CHART_SLOPE_MEDIUM_EASY,
  SLOPE_CHART_SLOPE_MEDIUM_HARD,
  SLOPE_CHART_SURFACE,
} from 'src/app/constants/slope-chart';
import {MapService} from 'src/app/services/base/map.service';
import {EGeojsonGeometryTypes} from 'src/app/types/egeojson-geometry-types.enum';
import {ESlopeChartSurface} from 'src/app/types/eslope-chart.enum';
import {ILocation} from 'src/app/types/location';
import {IGeojsonFeature, ILineString} from 'src/app/types/model';
import {ISlopeChartHoverElements} from 'src/app/types/slope-chart';

@Component({
  selector: 'wm-slope-chart',
  templateUrl: './slope-chart.component.html',
  styleUrls: ['./slope-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmSlopeChartComponent implements OnChanges {
  @ViewChild('chartCanvas') set content(content: ElementRef) {
    if (this._chart != null) {
      this._chart.destroy();
    }
    this._chartCanvas = content.nativeElement;
  }

  @Output('hover') hover: EventEmitter<ISlopeChartHoverElements> =
    new EventEmitter<ISlopeChartHoverElements>();

  private _chartCanvas: any;
  private _chart: Chart;
  private _chartValues: Array<ILocation>;
  public surfaces: Array<{
    id: ESlopeChartSurface;
    backgroundColor: string;
  }> = [];

  public route: IGeojsonFeature;
  public slopeValues: Array<[number, number]>;
  public slope: {
    available: boolean;
    selectedValue: number;
    selectedPercentage: number;
  } = {
    available: true,
    selectedValue: undefined,
    selectedPercentage: 0,
  };
  @Input()
  currentTrack: CGeojsonLineStringFeature;
  constructor(private _mapService: MapService) {
    Chart.register(...registerables);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentTrack != null && changes.currentTrack.currentValue != null) {
      this._setChart(this.currentTrack);
    }
  }
  /**
   * Calculate all the chart values and trigger the chart representation
   */
  private _setChart(route: any) {
    if (!!this._chartCanvas && !!route) {
      let surfaceValues: Array<{
          surface: string;
          values: Array<number>;
          locations: Array<ILocation>;
        }> = [],
        slopeValues: Array<[number, number]> = [],
        labels: Array<number> = [],
        steps: number = 100,
        trackLength: number = 0,
        currentDistance: number = 0,
        previousLocation: ILocation,
        currentLocation: ILocation,
        maxAlt: number = undefined,
        minAlt: number = undefined,
        usedSurfaces: Array<ESlopeChartSurface> = [];

      this._chartValues = [];

      labels.push(0);
      currentLocation = new CLocation(
        route.geometry.coordinates[0][0],
        route.geometry.coordinates[0][1],
        route.geometry.coordinates[0][2],
      );
      this._chartValues.push(currentLocation);
      maxAlt = currentLocation.altitude;
      minAlt = currentLocation.altitude;

      let surface = Object.values(ESlopeChartSurface)[0];
      surfaceValues = this._setSurfaceValue(
        surface,
        route.geometry.coordinates[0][2],
        [currentLocation],
        surfaceValues,
      );
      if (!usedSurfaces.includes(surface)) usedSurfaces.push(surface);
      slopeValues.push([route.geometry.coordinates[0][2], 0]);

      // Calculate track length and max/min altitude
      for (let i = 1; i < route.geometry.coordinates.length; i++) {
        previousLocation = currentLocation;
        currentLocation = new CLocation(
          route.geometry.coordinates[i][0],
          route.geometry.coordinates[i][1],
          route.geometry.coordinates[i][2],
        );
        trackLength += this._mapService.getDistanceBetweenPoints(previousLocation, currentLocation);

        if (!maxAlt || maxAlt < currentLocation.altitude) maxAlt = currentLocation.altitude;
        if (!minAlt || minAlt > currentLocation.altitude) minAlt = currentLocation.altitude;
      }

      let step: number = 1,
        locations: Array<ILocation> = [];
      currentLocation = new CLocation(
        route.geometry.coordinates[0][0],
        route.geometry.coordinates[0][1],
        route.geometry.coordinates[0][2],
      );

      // Create the chart datasets
      for (let i = 1; i < route.geometry.coordinates.length && step <= steps; i++) {
        locations.push(currentLocation);
        previousLocation = currentLocation;
        currentLocation = new CLocation(
          route.geometry.coordinates[i][0],
          route.geometry.coordinates[i][1],
          route.geometry.coordinates[i][2],
        );
        let localDistance: number = this._mapService.getDistanceBetweenPoints(
          previousLocation,
          currentLocation,
        );
        currentDistance += localDistance;

        while (currentDistance >= (trackLength / steps) * step) {
          let difference: number = localDistance - (currentDistance - (trackLength / steps) * step),
            deltaLongitude: number = currentLocation.longitude - previousLocation.longitude,
            deltaLatitude: number = currentLocation.latitude - previousLocation.latitude,
            deltaAltitude: number = currentLocation.altitude - previousLocation.altitude,
            longitude: number =
              previousLocation.longitude + (deltaLongitude * difference) / localDistance,
            latitude: number =
              previousLocation.latitude + (deltaLatitude * difference) / localDistance,
            altitude: number = Math.round(
              previousLocation.altitude + (deltaAltitude * difference) / localDistance,
            ),
            surface =
              Object.values(ESlopeChartSurface)[
                Math.round(step / 10) % (Object.keys(ESlopeChartSurface).length - 2)
              ],
            slope: number = parseFloat(
              (
                ((altitude - this._chartValues[this._chartValues.length - 1].altitude) * 100) /
                (trackLength / steps)
              ).toPrecision(1),
            );

          let intermediateLocation: ILocation = new CLocation(longitude, latitude, altitude);

          this._chartValues.push(intermediateLocation);

          locations.push(intermediateLocation);
          surfaceValues = this._setSurfaceValue(surface, altitude, locations, surfaceValues);
          locations = [intermediateLocation];
          if (!usedSurfaces.includes(surface)) usedSurfaces.push(surface);
          slopeValues.push([altitude, slope]);

          labels.push(parseFloat(((step * trackLength) / (steps * 1000)).toFixed(1)));

          step++;
        }
      }

      this.surfaces = [];
      for (let surface of usedSurfaces) {
        this.surfaces.push({
          id: surface,
          backgroundColor: SLOPE_CHART_SURFACE[surface].backgroundColor,
        });
      }

      setTimeout(() => {
        this._createChart(labels, trackLength, maxAlt, surfaceValues, slopeValues);
      }, 400);
    }
  }

  /**
   * Set the surface value on a specific surface
   *
   * @param surface the surface type
   * @param value the value
   * @param values the current values
   * @returns
   */
  private _setSurfaceValue(
    surface: string,
    value: number,
    locations: Array<ILocation>,
    values: Array<{
      surface: string;
      values: Array<number>;
      locations: Array<ILocation>;
    }>,
  ): Array<{
    surface: string;
    values: Array<number>;
    locations: Array<ILocation>;
  }> {
    let oldSurface: string = values?.[values.length - 1]?.surface;

    if (oldSurface === surface) {
      // Merge the old surface segment with the new one
      values[values.length - 1].values.push(value);
      if (values[values.length - 1].locations.length > 0)
        values[values.length - 1].locations.splice(-1, 1);
      values[values.length - 1].locations.push(...locations);
    } else {
      //Creare a new surface segment
      let nullElements: Array<any> = [];
      if (values?.[values.length - 1]?.values) {
        nullElements.length = values[values.length - 1].values.length;
        values[values.length - 1].values.push(value);
      }
      values.push({
        surface,
        values: [...nullElements, value],
        locations,
      });
    }

    return values;
  }

  /**
   * Return a chart.js dataset for a surface
   *
   * @param values the chart values
   * @param surface the surface type
   * @returns
   */
  private _getSlopeChartSurfaceDataset(
    values: Array<number>,
    surface: ESlopeChartSurface,
  ): ChartDataset<'line', any> {
    return {
      fill: true,
      cubicInterpolationMode: 'monotone',
      tension: 0.3,
      backgroundColor: 'rgb(' + SLOPE_CHART_SURFACE[surface].backgroundColor + ')',
      borderColor: 'rgba(255, 199, 132, 0)',
      pointRadius: 0,
      data: values,
      spanGaps: false,
    };
  }

  /**
   * Return an RGB color for the given slope percentage value
   *
   * @param value the slope percentage value
   * @returns
   */
  private _getSlopeGradientColor(value: number): string {
    let min: [number, number, number],
      max: [number, number, number],
      proportion: number = 0,
      step: number = 15 / 4;

    value = Math.abs(value);

    if (value <= 0) {
      min = SLOPE_CHART_SLOPE_EASY;
      max = SLOPE_CHART_SLOPE_EASY;
    } else if (value < step) {
      min = SLOPE_CHART_SLOPE_EASY;
      max = SLOPE_CHART_SLOPE_MEDIUM_EASY;
      proportion = value / step;
    } else if (value < 2 * step) {
      min = SLOPE_CHART_SLOPE_MEDIUM_EASY;
      max = SLOPE_CHART_SLOPE_MEDIUM;
      proportion = (value - step) / step;
    } else if (value < 3 * step) {
      min = SLOPE_CHART_SLOPE_MEDIUM;
      max = SLOPE_CHART_SLOPE_MEDIUM_HARD;
      proportion = (value - 2 * step) / step;
    } else if (value < 4 * step) {
      min = SLOPE_CHART_SLOPE_MEDIUM_HARD;
      max = SLOPE_CHART_SLOPE_HARD;
      proportion = (value - 3 * step) / step;
    } else {
      min = SLOPE_CHART_SLOPE_HARD;
      max = SLOPE_CHART_SLOPE_HARD;
      proportion = 1;
    }

    let result: [string, string, string] = ['0', '0', '0'];

    result[0] = Math.abs(Math.round(min[0] + (max[0] - min[0]) * proportion)).toString(16);
    result[1] = Math.abs(Math.round(min[1] + (max[1] - min[1]) * proportion)).toString(16);
    result[2] = Math.abs(Math.round(min[2] + (max[2] - min[2]) * proportion)).toString(16);

    return (
      '#' +
      (result[0].length < 2 ? '0' : '') +
      result[0] +
      (result[1].length < 2 ? '0' : '') +
      result[1] +
      (result[2].length < 2 ? '0' : '') +
      result[2]
    );
  }

  /**
   * Return a chart.js dataset for the slope values
   *
   * @param slopeValues the chart slope values as Array<[chartValue, slopePercentage]>
   * @returns
   */
  private _getSlopeChartSlopeDataset(
    slopeValues: Array<[number, number]>,
  ): Array<ChartDataset<'line', any>> {
    let values: Array<number> = slopeValues.map(value => value[0]),
      slopes: Array<number> = slopeValues.map(value => value[1]);

    return [
      {
        fill: false,
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderColor: context => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;

          if (!chartArea) {
            // This case happens on initial chart load
            return null;
          }

          let gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);

          for (let i in slopes) {
            gradient.addColorStop(
              parseInt(i) / slopes.length,
              this._getSlopeGradientColor(slopes[i]),
            );
          }

          return gradient;
        },
        borderWidth: 3,
        pointRadius: 0,
        pointHoverBackgroundColor: '#000000',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        data: values,
        spanGaps: false,
      },
      {
        fill: false,
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        borderColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 8,
        pointRadius: 0,
        data: values,
        spanGaps: false,
      },
    ];
  }

  /**
   * Create the chart
   *
   * @param labels the chart labels
   * @param length the track length
   * @param maxAltitude the max altitude value
   * @param surfaceValues the surface values
   * @param slopeValues the slope values
   */
  private _createChart(
    labels: Array<number>,
    length: number,
    maxAltitude: number,
    surfaceValues: Array<{
      surface: string;
      values: Array<number>;
      locations: Array<ILocation>;
    }>,
    slopeValues: Array<[number, number]>,
  ) {
    if (this._chartCanvas) {
      let surfaceDatasets: Array<ChartDataset> = [];

      this.slopeValues = slopeValues;

      for (let i in surfaceValues) {
        surfaceDatasets.push(
          this._getSlopeChartSurfaceDataset(
            surfaceValues[i].values,
            <ESlopeChartSurface>surfaceValues[i].surface,
          ),
        );
      }

      this._chart = new Chart(this._chartCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [...this._getSlopeChartSlopeDataset(slopeValues), ...surfaceDatasets],
        },
        options: {
          events: ['mousemove', 'click', 'touchstart', 'touchmove', 'pointermove'],
          layout: {
            padding: {
              top: 40,
            },
          },
          maintainAspectRatio: false,
          hover: {
            intersect: false,
            mode: 'index',
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: true,
              intersect: false,
              mode: 'index',
              cornerRadius: 8,
              caretPadding: 150,
              xAlign: 'center',
              yAlign: 'bottom',
              titleMarginBottom: 0,
              callbacks: {
                title: function (items: Array<TooltipItem<'line'>>): string {
                  let result: string = items[0].raw + ' m';

                  if (typeof slopeValues?.[items[0].dataIndex]?.[1] === 'number')
                    result += ' / ' + slopeValues[items[0].dataIndex][1] + '%';

                  return result;
                },
                label: function (): string {
                  return undefined;
                },
              },
            },
          },
          scales: {
            y: {
              title: {
                display: false,
              },
              max: maxAltitude,
              ticks: {
                maxTicksLimit: 2,
                maxRotation: 0,
                includeBounds: true,
                // mirror: true,
                z: 10,
                align: 'end',
                callback: (
                  tickValue: number | string,
                  index: number,
                  ticks: Array<Tick>,
                ): string => {
                  return tickValue + ' m';
                },
              },
              grid: {
                drawOnChartArea: true,
                drawTicks: false,
                drawBorder: false,
                borderDash: [10, 10],
                color: '#D2D2D2',
              },
            },
            x: {
              title: {
                display: false,
              },
              max: length,
              min: 0,
              ticks: {
                maxTicksLimit: 4,
                maxRotation: 0,
                includeBounds: true,
                callback: (
                  tickValue: number | string,
                  index: number,
                  ticks: Array<Tick>,
                ): string => {
                  return labels[index] + ' km';
                },
              },
              grid: {
                color: '#D2D2D2',
                drawOnChartArea: false,
                drawTicks: true,
                drawBorder: true,
                tickLength: 10,
              },
            },
          },
        },
        plugins: [
          {
            id: 'webmappTooltipPlugin',
            beforeTooltipDraw: chart => {
              let tooltip: TooltipModel<'line'> = chart.tooltip;

              if (
                <any>tooltip != null &&
                (<any>tooltip)._active &&
                (<any>tooltip)._active.length > 0
              ) {
                let activePoint = (<any>tooltip)._active[0],
                  ctx = chart.ctx,
                  x = activePoint.element.x,
                  topY = chart.scales['y'].top - 15,
                  bottomY = chart.scales['y'].bottom + 10;

                // draw line
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();

                if (
                  (<any>tooltip)?._tooltipItems?.[0]?.dataIndex >= 0 &&
                  typeof labels[(<any>tooltip)?._tooltipItems?.[0]?.dataIndex] !== 'undefined'
                ) {
                  let distance: string = labels[(<any>tooltip)._tooltipItems[0].dataIndex] + ' km',
                    measure: TextMetrics = ctx.measureText(distance),
                    minX: number = Math.max(
                      0,
                      Math.min(chart.width - measure.width, x - measure.width / 2),
                    ),
                    minY: number = bottomY;

                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(minX - 4, minY, measure.width + 8, 20);
                  ctx.fillStyle = '#000000';
                  ctx.fillText(distance, minX, bottomY + 14);
                }

                ctx.restore();

                this.slope.selectedValue =
                  slopeValues[(<any>tooltip)?._tooltipItems?.[0]?.dataIndex][1];
                this.slope.selectedPercentage =
                  (Math.min(15, Math.max(0, Math.abs(this.slope.selectedValue))) * 100) / 15;

                let index: number = (<any>tooltip)._tooltipItems[0].dataIndex,
                  locations: Array<ILocation> = [],
                  surfaceColor: string;

                for (let i in surfaceValues) {
                  if (!!surfaceValues[i].values[index]) {
                    locations = surfaceValues[i].locations;
                    let surface = surfaceValues[i].surface;

                    for (let s of this.surfaces) {
                      if (s.id === surface) {
                        surfaceColor = s.backgroundColor;
                        break;
                      }
                    }
                    break;
                  }
                }

                let coordinates: ILineString = <ILineString>locations.map(location => {
                    // return this._mapService.coordsFromLonLat(
                    return [location.longitude, location.latitude];
                  }),
                  surfaceTrack: CGeojsonLineStringFeature = new CGeojsonLineStringFeature({
                    type: EGeojsonGeometryTypes.LINE_STRING,
                    coordinates,
                  });

                surfaceTrack.setProperty('color', surfaceColor);

                this.hover.emit({
                  location: this._chartValues[(tooltip as any)?._tooltipItems?.[0]?.dataIndex],
                  track: surfaceTrack,
                });
              } else {
                this.slope.selectedValue = undefined;
                this.hover.emit(undefined);
              }
            },
          },
        ],
      });
    }
  }
}
