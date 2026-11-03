import {Inject, Injectable, InjectionToken, OnDestroy, Optional} from '@angular/core';
import {LineString, MultiLineString} from 'geojson';
import {BehaviorSubject, Observable, Subscription, firstValueFrom, of, timer} from 'rxjs';
import {catchError, filter, map, take, takeUntil, throttleTime} from 'rxjs/operators';
import {LineString as OlLineString, MultiLineString as OlMultiLineString} from 'ol/geom';
import {fromLonLat, toLonLat} from 'ol/proj';
import {getDistance} from 'ol/sphere';
import {Location} from '@wm-types/feature';
import {GeolocationService} from '@wm-core/services/geolocation.service';
import {EcService} from '@wm-core/store/features/ec/ec.service';
import {deviceActiveRoutes} from '@wm-core/utils/localForage';
import {DIARY_RETENTION_DAYS} from './diary-outbox.service';

/** Distanza dal tracciato entro cui l'utente è «sul cammino» (oc:8169, ciclo 2). */
export const DIARY_PROXIMITY_METERS = 1000;
/** Al massimo una posizione salvata ogni tanti ms. */
export const DIARY_PROXIMITY_THROTTLE_MS = 180000;
/** Override nei test. */
export const DIARY_PROXIMITY_THROTTLE = new InjectionToken<number>('DIARY_PROXIMITY_THROTTLE');
/** Una posizione più vicina di così all'ultima salvata non si aggiunge (m). */
const POSITION_MIN_STEP_METERS = 200;
/** Tetto alle posizioni salvate: oltre si tengono le più recenti. */
const POSITION_MAX = 5000;
/** Attesa massima per scaricare una tappa prima di ricadere sul rettangolo (ms). */
const TRACK_FETCH_TIMEOUT_MS = 15000;
const POSITIONS_KEY = '__positions';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Posizione salvata del telefono. */
interface StoredPosition {
  lon: number;
  lat: number;
  /** istante (ms) */
  t: number;
}

/**
 * La posizione cade nel rettangolo [minLon, minLat, maxLon, maxLat] allargato di `marginMeters`.
 *
 * @param bbox rettangolo
 * @param lonLat posizione [lon, lat]
 * @param marginMeters margine in metri
 * @returns `true` se dentro
 */
export function bboxContains(bbox: number[], lonLat: [number, number], marginMeters: number): boolean {
  if (!bbox || bbox.length < 4) return false;
  const [lon, lat] = lonLat;
  const dLat = marginMeters / 111320;
  const dLon = marginMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return lon >= bbox[0] - dLon && lon <= bbox[2] + dLon && lat >= bbox[1] - dLat && lat <= bbox[3] + dLat;
}

/**
 * La posizione è entro `meters` dalla linea (distanza geodetica dal punto più vicino).
 *
 * @param lonLat posizione [lon, lat]
 * @param line tracciato (EPSG:4326)
 * @param meters soglia in metri
 * @returns `true` se vicino
 */
export function isNearLine(lonLat: [number, number], line: LineString | MultiLineString, meters: number): boolean {
  if (!line?.coordinates?.length) return false;
  const geom =
    line.type === 'MultiLineString'
      ? new OlMultiLineString(line.coordinates.map(part => part.map(c => fromLonLat([c[0], c[1]]))))
      : new OlLineString((line as LineString).coordinates.map(c => fromLonLat([c[0], c[1]])));
  const closest = toLonLat(geom.getClosestPoint(fromLonLat(lonLat))) as [number, number];
  return getDistance(lonLat, closest) <= meters;
}

/** Rettangolo [minLon, minLat, maxLon, maxLat] di una linea. */
function lineBbox(line: LineString | MultiLineString): number[] {
  const coords =
    line.type === 'MultiLineString'
      ? line.coordinates.reduce((acc, part) => acc.concat(part), [] as number[][])
      : (line as LineString).coordinates;
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

/**
 * Cammini «attivi» per il pulsante del diario (oc:8169, ciclo 2). In sottofondo, solo nella variante
 * camminiditalia dell'app, si salvano le posizioni del telefono (mappa aperta o registrazione), al
 * massimo una ogni `DIARY_PROXIMITY_THROTTLE_MS` e non più vicine di 200 m all'ultima, per
 * `DIARY_RETENTION_DAYS` giorni: nessun download. Il confronto con le tappe avviene all'apertura del
 * dettaglio, quando le tappe sono note: del cammino (`evaluateLayer`, linee scaricate con
 * `EcService.getEcTrack`, in cache) o della tappa (`evaluateTrack`, linea già caricata). Un cammino
 * con una posizione entro `DIARY_PROXIMITY_METERS` da una tappa resta attivo 90 giorni; senza
 * nessuna linea disponibile vale il rettangolo del cammino. Lo stato è del telefono.
 */
@Injectable({providedIn: 'root'})
export class ActiveRouteService implements OnDestroy {
  private _lastSeen$ = new BehaviorSubject<Map<string, number>>(new Map());
  private _positions: StoredPosition[] = [];
  private _lastPositionAt$ = new BehaviorSubject<number | null>(null);
  /**
   * Istante dell'ultima posizione salvata: i dettagli aperti lo ascoltano per rifare il confronto
   * quando arriva una posizione nuova, anche a dettaglio già aperto.
   */
  readonly lastPositionAt$: Observable<number | null> = this._lastPositionAt$.asObservable();
  /** Cammino → istante dell'ultima posizione già confrontata senza esito (evita nuovi download). */
  private _checkedUntil = new Map<string, number>();
  private _started = false;
  private _sub = new Subscription();
  private _throttleMs: number;

  constructor(
    private _geolocationSvc: GeolocationService,
    private _ecSvc: EcService,
    @Optional() @Inject(DIARY_PROXIMITY_THROTTLE) throttleMs?: number,
  ) {
    this._throttleMs = throttleMs ?? DIARY_PROXIMITY_THROTTLE_MS;
  }

  /** `true` dopo `start()`: fuori da camminiditalia il pulsante resta com'era. */
  get active(): boolean {
    return this._started;
  }

  /** Avvia il salvataggio delle posizioni (idempotente) e pulisce ciò che ha più di 90 giorni. */
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;
    const limit = Date.now() - DIARY_RETENTION_DAYS * DAY_MS;
    const stored = new Map<string, number>();
    let positions: StoredPosition[] = [];
    await deviceActiveRoutes
      .iterate<unknown, void>((value, key) => {
        if (key === POSITIONS_KEY) positions = (value as StoredPosition[]) ?? [];
        else stored.set(key, value as number);
      })
      .catch(() => undefined);
    this._positions = positions.filter(p => p.t >= limit);
    if (this._positions.length !== positions.length) await this._savePositions();
    this._lastSeen$.next(stored);
    this._lastPositionAt$.next(this._latestPositionTime());
    this._sub.add(
      this._geolocationSvc.onLocationChange$
        .pipe(
          filter(l => l?.latitude != null && l?.longitude != null),
          // la prima subito, poi l'ultima di ogni finestra: uno spostamento non va perso
          throttleTime(this._throttleMs, undefined, {leading: true, trailing: true}),
        )
        .subscribe(l => void this.recordPosition(l)),
    );
  }

  /** Ferma l'ascolto della posizione. */
  ngOnDestroy(): void {
    this._sub.unsubscribe();
  }

  /**
   * Si può scrivere il diario: fuori da camminiditalia sempre; altrimenti se uno dei cammini del
   * contesto è attivo.
   * @param layerIds cammini del contesto (il cammino aperto, o i cammini della tappa)
   * @returns stream del permesso
   */
  canWrite$(layerIds: (number | string | null | undefined)[]): Observable<boolean> {
    if (!this._started) return of(true);
    const ids = layerIds.filter(id => id != null).map(String);
    return this._lastSeen$.pipe(map(seen => ids.some(id => this._fresh(seen.get(id)))));
  }

  /**
   * Salva una posizione del telefono (in sottofondo).
   * @param location posizione corrente
   */
  async recordPosition(location: Location): Promise<void> {
    const pos: StoredPosition = {lon: location.longitude, lat: location.latitude, t: Date.now()};
    const last = this._positions[this._positions.length - 1];
    if (last && getDistance([last.lon, last.lat], [pos.lon, pos.lat]) < POSITION_MIN_STEP_METERS) return;
    this._positions = this._positions.concat(pos).slice(-POSITION_MAX);
    await this._savePositions();
    this._lastPositionAt$.next(pos.t);
  }

  /** @returns le posizioni salvate */
  async positions(): Promise<{lon: number; lat: number; t: number}[]> {
    return this._positions.slice();
  }

  /**
   * All'apertura del cammino: confronta le posizioni salvate con le sue tappe.
   * @param layerId cammino
   * @param trackIds tappe del cammino
   * @param bbox rettangolo del cammino, per il ripiego senza linee
   */
  async evaluateLayer(layerId: number | string, trackIds: (number | string)[], bbox?: number[]): Promise<void> {
    const key = String(layerId);
    if (this._isToday(this._lastSeen$.value.get(key))) return;
    const latest = this._latestPositionTime();
    if (latest == null || this._checkedUntil.get(key) === latest) return;
    const candidates = bbox?.length
      ? this._positions.filter(p => bboxContains(bbox, [p.lon, p.lat], DIARY_PROXIMITY_METERS))
      : this._positions;
    if (!candidates.length) {
      this._checkedUntil.set(key, latest);
      return;
    }
    let checkedAny = false;
    for (const id of trackIds) {
      const line = await this._line(id);
      if (!line) continue;
      checkedAny = true;
      if (this._anyNear(candidates, line)) {
        await this._mark([layerId]);
        return;
      }
    }
    if (!checkedAny && bbox?.length) {
      await this._mark([layerId]);
      return;
    }
    this._checkedUntil.set(key, latest);
  }

  /**
   * All'apertura di una tappa: la sua linea è già nota, rende attivi i suoi cammini.
   * @param line linea della tappa
   * @param layerIds cammini a cui appartiene la tappa
   */
  async evaluateTrack(line: LineString | MultiLineString | null | undefined, layerIds: (number | string)[]): Promise<void> {
    const ids = layerIds.filter(id => id != null && !this._isToday(this._lastSeen$.value.get(String(id))));
    if (!line?.coordinates?.length || !ids.length) return;
    if (this._anyNear(this._positions, line)) await this._mark(ids);
  }

  private _anyNear(positions: StoredPosition[], line: LineString | MultiLineString): boolean {
    const box = lineBbox(line);
    return positions
      .filter(p => bboxContains(box, [p.lon, p.lat], DIARY_PROXIMITY_METERS))
      .some(p => isNearLine([p.lon, p.lat], line, DIARY_PROXIMITY_METERS));
  }

  private async _line(id: number | string): Promise<LineString | MultiLineString | null> {
    const feature = await firstValueFrom(
      this._ecSvc.getEcTrack(id).pipe(
        takeUntil(timer(TRACK_FETCH_TIMEOUT_MS)),
        take(1),
        catchError(() => of(null)),
      ),
      {defaultValue: null},
    );
    const geometry = feature?.geometry as LineString | MultiLineString | undefined;
    return geometry?.coordinates?.length ? geometry : null;
  }

  private async _mark(layerIds: (number | string)[]): Promise<void> {
    const now = Date.now();
    const next = new Map(this._lastSeen$.value);
    for (const id of layerIds) {
      next.set(String(id), now);
      await deviceActiveRoutes.setItem(String(id), now).catch(() => undefined);
    }
    this._lastSeen$.next(next);
  }

  private async _savePositions(): Promise<void> {
    await deviceActiveRoutes.setItem(POSITIONS_KEY, this._positions).catch(() => undefined);
  }

  private _latestPositionTime(): number | null {
    return this._positions.length ? this._positions[this._positions.length - 1].t : null;
  }

  private _fresh(lastSeen: number | undefined): boolean {
    return lastSeen != null && Date.now() - lastSeen < DIARY_RETENTION_DAYS * DAY_MS;
  }

  private _isToday(lastSeen: number | undefined): boolean {
    return lastSeen != null && new Date(lastSeen).toDateString() === new Date().toDateString();
  }
}
