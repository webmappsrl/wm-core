import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {Chart, ChartDataset, registerables, Tick, TooltipItem, TooltipModel} from 'chart.js';
import {
  SLOPE_CHART_SLOPE_EASY,
  SLOPE_CHART_SLOPE_HARD,
  SLOPE_CHART_SLOPE_MEDIUM,
  SLOPE_CHART_SLOPE_MEDIUM_EASY,
  SLOPE_CHART_SLOPE_MEDIUM_HARD,
  SLOPE_CHART_SURFACE,
} from '../constants/slope-chart';
import {EGeojsonGeometryTypes} from '../types/egeojson-geometry-types.enum';
import {ESlopeChartSurface} from '../types/eslope-chart.enum';
import {ILineString} from '../types/model';
import {ISlopeChartHoverElements} from '../types/slope-chart';
import {Location} from '../types/location';
import {Feature, Geometry, LineString, Position} from 'geojson';
import {BehaviorSubject} from 'rxjs';
import {filter, switchMap, take} from 'rxjs/operators';
import {WmFeature} from '@wm-types/feature';

@Component({
  selector: 'wm-slope-chart',
  templateUrl: './slope-chart.component.html',
  styleUrls: ['./slope-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmSlopeChartComponent implements OnInit {
  private _chart: Chart;
  private _chartCanvas: any;
  private _chartValues: Array<Location>;
  private _isInit$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @ViewChild('chartCanvas') set content(content: ElementRef) {
    if (this._chart != null) {
      this._chart.destroy();
    }
    this._chartCanvas = content != null ? content.nativeElement : null;
    if (this._chartCanvas != null) {
      this._isInit$.next(true);
    }
  }

  @Input()
  currentTrack: WmFeature<LineString>;
  @Output('hover') hover: EventEmitter<ISlopeChartHoverElements> =
    new EventEmitter<ISlopeChartHoverElements>();

  route: Feature;
  showChart$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  slope: {
    selectedValue: number | undefined;
    selectedPercentage: number;
  } = {
    selectedValue: undefined,
    selectedPercentage: 0,
  };
  slopeValues: Array<[number, number]>;
  surfaces: Array<{
    id: ESlopeChartSurface;
    backgroundColor: string;
  }> = [];

  constructor() {
    Chart.register(...registerables);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentTrack) {
      this._init();
    }
  }

  ngOnInit(): void {}

  /**
   * Return the distance in meters between two locations
   *
   * @param point1 the first location
   * @param point2 the second location
   */
  getDistanceBetweenPoints(point1: Location, point2: Location): number {
    let R: number = 6371e3;
    let lat1: number = (point1.latitude * Math.PI) / 180;
    let lat2: number = (point2.latitude * Math.PI) / 180;
    let lon1: number = (point1.longitude * Math.PI) / 180;
    let lon2: number = (point2.longitude * Math.PI) / 180;
    let dlat: number = lat2 - lat1;
    let dlon: number = lon2 - lon1;

    let a: number =
      Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
    let c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
    minAltitude: number,
    surfaceValues: Array<{
      surface: string;
      values: Array<number>;
      locations: Array<Location>;
    }>,
    slopeValues: Array<[number, number]>,
  ) {
    const delta = (maxAltitude - minAltitude) * 0.1;
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
      if (this._chart != null) {
        this._chart.destroy();
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
              max: Math.round(maxAltitude + delta),
              min: Math.round(minAltitude - delta),
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
                  locations: Array<Location> = [],
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

                let coordinates: Position[] = <Position[]>(
                  locations.map(location => [location.longitude, location.latitude])
                );
                const surfaceTrack: Feature<LineString> = {
                  type: 'Feature',
                  geometry: {type: 'LineString', coordinates},
                  properties: {
                    color: surfaceColor,
                  },
                };

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

  private _init(): void {
    this.showChart$.next(this._is3dGeometry(this.currentTrack.geometry));
    this._isInit$
      .pipe(
        filter(f => f),
        switchMap(() => this.showChart$),
        take(1),
      )
      .subscribe(() => {
        this._setChart(this.currentTrack);
      });
  }

  private _is3dGeometry(geometry: Geometry): boolean {
    if (geometry == null || geometry.type !== 'LineString') return false;

    // Controlla che ogni coordinate abbia una lunghezza di 3 e verifica che almeno una abbia una terza posizione diversa da 0
    return geometry.coordinates.some(coord => coord.length === 3 && coord[2] !== 0);
  }

  /**
   * Calculate all the chart values and trigger the chart representation
   */
  private _setChart(route: any): void {
    if (!!this._chartCanvas && !!route) {
      let surfaceValues: Array<{
          surface: string;
          values: Array<number>;
          locations: Array<Location>;
        }> = [],
        slopeValues: Array<[number, number]> = [],
        labels: Array<number> = [],
        steps: number = 100,
        trackLength: number = 0,
        currentDistance: number = 0,
        previousLocation: Location,
        currentLocation: Location,
        maxAlt: number = undefined,
        minAlt: number = undefined,
        usedSurfaces: Array<ESlopeChartSurface> = [];

      this._chartValues = [];
      const coordinates = route.geometry ? route.geometry.coordinates : route.geojson.coordinates;
      labels.push(0);
      currentLocation = {
        longitude: coordinates[0][0],
        latitude: coordinates[0][1],
        altitude: coordinates[0][2] ?? 0,
      };
      this._chartValues.push(currentLocation);
      maxAlt = currentLocation.altitude;
      minAlt = currentLocation.altitude;

      let surface = Object.values(ESlopeChartSurface)[0];
      surfaceValues = this._setSurfaceValue(
        surface,
        coordinates[0][2] ?? 0,
        [currentLocation],
        surfaceValues,
      );
      if (!usedSurfaces.includes(surface)) usedSurfaces.push(surface);
      slopeValues.push([coordinates[0][2] ?? 0, 0]);

      // Calculate track length and max/min altitude
      for (let i = 1; i < coordinates.length; i++) {
        previousLocation = currentLocation;
        currentLocation = {
          longitude: coordinates[i][0],
          latitude: coordinates[i][1],
          altitude: coordinates[i][2] ?? 0,
        };
        trackLength += this.getDistanceBetweenPoints(previousLocation, currentLocation);

        if (maxAlt < currentLocation.altitude) {
          maxAlt = currentLocation.altitude;
        }
        if (minAlt > currentLocation.altitude) {
          minAlt = currentLocation.altitude;
        }
      }

      let step: number = 1,
        locations: Array<Location> = [];
      currentLocation = {
        longitude: coordinates[0][0],
        latitude: coordinates[0][1],
        altitude: coordinates[0][2] ?? 0,
      };

      // Create the chart datasets
      for (let i = 1; i < coordinates.length && step <= steps; i++) {
        locations.push(currentLocation);
        previousLocation = currentLocation;
        currentLocation = {
          longitude: coordinates[i][0],
          latitude: coordinates[i][1],
          altitude: coordinates[i][2] ?? 0,
        };
        let localDistance: number = this.getDistanceBetweenPoints(
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

          let intermediateLocation: Location = {longitude, latitude, altitude};

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

      this._createChart(labels, trackLength, maxAlt, minAlt, surfaceValues, slopeValues);
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
    locations: Array<Location>,
    values: Array<{
      surface: string;
      values: Array<number>;
      locations: Array<Location>;
    }>,
  ): Array<{
    surface: string;
    values: Array<number>;
    locations: Array<Location>;
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
}
