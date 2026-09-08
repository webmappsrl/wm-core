import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
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
import {ESlopeChartSurface} from '../types/eslope-chart.enum';
import {Feature, Geometry, LineString, Position} from 'geojson';
import {BehaviorSubject} from 'rxjs';
import {filter, switchMap, take} from 'rxjs/operators';
import {Location, WmFeature} from '@wm-types/feature';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {GeoutilsService} from '../services/geoutils.service';
import {
  HOVER_DISMISS_DELAY_MS,
  LOCATION_MARKER_COLOR,
  LOCATION_MARKER_COLOR_RGB,
} from '../constants/track-remaining-distance';

@Component({
  standalone: false,
  selector: 'wm-slope-chart',
  templateUrl: './slope-chart.component.html',
  styleUrls: ['./slope-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmSlopeChartComponent implements OnInit, OnDestroy {
  private _chart: Chart;
  private _chartCanvas: any;
  private _chartValues: Array<Location>;
  private _isInit$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  // Letto da webmappPositionMarkerPlugin per nascondere il marker GPS mentre l'utente
  // interagisce con il tooltip di hover/touch esistente (vedi oc:8177).
  private _isHoverActive = false;
  private _hoverDismissTimeoutId: ReturnType<typeof setTimeout> | null = null;
  // Stessa icona usata da WmMapPositionDirective per il marker "sei qui" sulla mappa, per
  // coerenza visiva tra grafico e mappa (vedi oc:8177).
  private _positionIcon: HTMLImageElement = new Image();
  private _themeCssVarCache = new Map<string, string>();

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
  @Input()
  trackProgress: number | null;
  @Output('hover') hover: EventEmitter<WmSlopeChartHoverElements> =
    new EventEmitter<WmSlopeChartHoverElements>();

  route: Feature;
  showChart$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  // `source` distingue se il valore di pendenza mostrato viene dal tocco sul grafico ('hover')
  // o dalla posizione GPS live ('gps'), per colorare diversamente il pallino sulla barra
  // Pendenza (vedi oc:8177).
  slope: {
    selectedValue: number | undefined;
    selectedPercentage: number;
    source: 'hover' | 'gps' | null;
  } = {
    selectedValue: undefined,
    selectedPercentage: 0,
    source: null,
  };
  slopeValues: Array<[number, number]>;
  surfaces: Array<{
    id: ESlopeChartSurface;
    backgroundColor: string;
  }> = [];

  constructor(private _geoutilsSvc: GeoutilsService) {
    Chart.register(...registerables);
    this._positionIcon.src = '/map-core/assets/location-icon.png';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentTrack) {
      this._init();
    } else if (changes.trackProgress && this._chart != null) {
      // Solo un redraw leggero: la recreate completa (_init/_createChart) resta riservata
      // al cambio traccia, per evitare di ricostruire il chart ad ogni fix GPS (oc:8177).
      this._chart.update();
    }
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this._clearHoverDismissTimer();
  }

  /**
   * Forza la chiusura del tooltip di hover/touch e fa ricomparire il marker GPS, trascorso
   * HOVER_DISMISS_DELAY_MS dall'ultima interazione (vedi oc:8177).
   */
  private _dismissHoverTooltip(): void {
    this._hoverDismissTimeoutId = null;
    if (this._chart == null) return;

    this._isHoverActive = false;
    this._chart.tooltip?.setActiveElements([], {x: 0, y: 0});
    this._chart.setActiveElements([]);
    this.slope.selectedValue = undefined;
    this.slope.source = null;
    this.hover.emit(undefined);
    this._chart.update();
  }

  private _resetHoverDismissTimer(): void {
    this._clearHoverDismissTimer();
    this._hoverDismissTimeoutId = setTimeout(
      () => this._dismissHoverTooltip(),
      HOVER_DISMISS_DELAY_MS,
    );
  }

  private _clearHoverDismissTimer(): void {
    if (this._hoverDismissTimeoutId != null) {
      clearTimeout(this._hoverDismissTimeoutId);
      this._hoverDismissTimeoutId = null;
    }
  }

  /**
   * Legge una CSS custom property del tema (definita a livello di :root/istanza), con
   * fallback se non disponibile — usata per disegnare sul canvas con gli stessi colori
   * del resto della UI (vedi oc:8177).
   *
   * Il risultato è cacheato per nome: `getComputedStyle()` forza un ricalcolo degli stili,
   * costo evitabile per un valore che non cambia mai durante la sessione del componente.
   */
  private _getThemeCssVar(name: string, fallback: string): string {
    if (!this._themeCssVarCache.has(name)) {
      const value = getComputedStyle(this._chartCanvas).getPropertyValue(name).trim();
      this._themeCssVarCache.set(name, value || fallback);
    }
    return this._themeCssVarCache.get(name);
  }

  /**
   * Traccia il path di un rettangolo con angoli arrotondati, senza fare fill/stroke — a
   * differenza di CanvasRenderingContext2D.roundRect(), supportato in modo più uniforme sulle
   * WebView meno recenti target di questa app hybrid (vedi oc:8177).
   */
  private _drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

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
          // A differenza di beforeTooltipDraw (che rifà il fire ad ogni redraw, anche quelli
          // programmatici innescati dagli aggiornamenti GPS), onHover scatta solo per
          // interazioni reali dell'utente — è il punto giusto da cui far ripartire il timer
          // di dismissal del tooltip (vedi oc:8177).
          onHover: (_event, elements) => {
            if (elements.length > 0) {
              this._resetHoverDismissTimer();
            }
          },
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
                this._isHoverActive = true;
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
                this.slope.source = 'hover';

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
                  location: this._chartValues[
                    (tooltip as any)?._tooltipItems?.[0]?.dataIndex
                  ] as Location,
                  track: surfaceTrack,
                });
              } else {
                this._isHoverActive = false;
                this._clearHoverDismissTimer();
                this.slope.selectedValue = undefined;
                this.slope.source = null;
                this.hover.emit(undefined);
              }
            },
          },
          {
            id: 'webmappPositionMarkerPlugin',
            afterDraw: chart => {
              if (this.trackProgress == null || this._isHoverActive || this._chartValues == null) {
                return;
              }

              const lastIndex = labels.length - 1;
              const index = Math.round(Math.max(0, Math.min(1, this.trackProgress)) * lastIndex);
              const altitude = this._chartValues[index]?.altitude;

              if (altitude == null) {
                return;
              }

              // Posizione pixel dall'elemento renderizzato del dataset, non da
              // scales['x'].getPixelForValue(): su CategoryScale quel metodo ignora l'indice
              // passato e cerca il valore per corrispondenza, sbagliando in presenza di km
              // arrotondati duplicati (vedi oc:8177).
              const point = (chart.getDatasetMeta(0).data[index] as any) ?? null;
              if (point == null) {
                return;
              }

              const ctx = chart.ctx,
                x = point.x,
                y = point.y,
                bottomY = chart.scales['y'].bottom,
                iconSize = 22;

              // Aggiorna la barra "Pendenza" esistente con il valore alla posizione GPS live,
              // stessa logica usata dal tooltip di hover (vedi oc:8177)
              const slopePercent = slopeValues[index]?.[1];
              if (typeof slopePercent === 'number') {
                this.slope.selectedValue = slopePercent;
                this.slope.selectedPercentage =
                  (Math.min(15, Math.max(0, Math.abs(slopePercent))) * 100) / 15;
                this.slope.source = 'gps';
              }

              ctx.save();

              // guida verticale fino all'asse, per leggibilità
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, bottomY);
              ctx.lineWidth = 1;
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
              ctx.stroke();

              // etichetta dislivello, sopra il marker — tinta trasparente + bordo tratteggiato
              const label = Math.round(altitude) + ' m',
                measure: TextMetrics = ctx.measureText(label),
                labelMinX = Math.max(0, Math.min(chart.width - measure.width, x - measure.width / 2)),
                labelY = y - iconSize / 2 - 8,
                pillX = labelMinX - 6,
                pillY = labelY - 15,
                pillW = measure.width + 12,
                pillH = 21,
                darkColor = this._getThemeCssVar('--wm-color-dark', '#323031');

              this._drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 6);
              ctx.fillStyle = `rgba(${LOCATION_MARKER_COLOR_RGB}, 0.14)`;
              ctx.fill();
              ctx.setLineDash([3, 2]);
              ctx.lineWidth = 1;
              ctx.strokeStyle = LOCATION_MARKER_COLOR;
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = darkColor;
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText(label, labelMinX, labelY);

              // marker di posizione, stessa icona usata sulla mappa (WmMapPositionDirective)
              if (this._positionIcon.complete && this._positionIcon.naturalWidth > 0) {
                ctx.drawImage(this._positionIcon, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
              } else {
                ctx.beginPath();
                ctx.arc(x, y, iconSize / 3, 0, 2 * Math.PI);
                ctx.fillStyle = LOCATION_MARKER_COLOR;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
              }

              ctx.restore();
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
        // pointHoverRadius a 0: l'evidenziazione nativa di Chart.js sul punto attivo dipende
        // da chart._active, lo stesso stato "bloccato attivo" del tooltip (vedi oc:8177) — su
        // touch reali il reset via setActiveElements([]) non è affidabile al 100%. La linea
        // verticale + etichetta disegnate da webmappTooltipPlugin sono già l'indicatore
        // primario del punto toccato, quindi il pallino nativo è ridondante e viene disattivato
        // per eliminare il rischio di rimanere visibile indefinitamente.
        pointHoverBackgroundColor: '#000000',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverRadius: 0,
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
    // Il cambio traccia ricrea il chart (_createChart) ma non toccherebbe altrimenti questo
    // stato di istanza: senza reset, se l'utente stava toccando il grafico esattamente al
    // cambio traccia, il marker GPS resterebbe nascosto sul nuovo chart finché non scatta
    // il vecchio timer di dismissal (fino a HOVER_DISMISS_DELAY_MS di ritardo) (vedi oc:8177).
    this._isHoverActive = false;
    this._clearHoverDismissTimer();
    this.slope.selectedValue = undefined;
    this.slope.source = null;
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

      // Stessa formula usata da GeoutilsService.getHaversineTrackLength, per garantire che
      // il totale del grafico e la distanza rimanente (oc:8177) restino sempre coerenti.
      const trackLength = this._geoutilsSvc.getHaversineTrackLength({
        type: 'LineString',
        coordinates,
      });

      // Calculate max/min altitude
      for (let i = 1; i < coordinates.length; i++) {
        previousLocation = currentLocation;
        currentLocation = {
          longitude: coordinates[i][0],
          latitude: coordinates[i][1],
          altitude: coordinates[i][2] ?? 0,
        };

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
