import {Location, UgcTrackStats, WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {UgcTrackStatsParams} from '@wm-core/types/config';

/**
 * Pulizia GPS e dati tecnici delle tracce UGC, identici a quelli del server (oc:8742).
 *
 * Traduzione alla lettera della specifica di wm-package,
 * `docs/knowledge/dati-tecnici-delle-tracce-ugc.md` (commit 295ad87, branch develop): i numeri
 * dei paragrafi nei commenti (§2 a, §3…) rimandano a quella pagina. I casi di test condivisi
 * stanno in `fixtures/ugc-track-stats/`. Una regola che cambia si cambia in entrambi i repo.
 */

/** Default della specifica §7: devono restare identici a quelli di wm-package. */
export const UGC_TRACK_STATS_DEFAULT_PARAMS: UgcTrackStatsParams = {
  max_accuracy: 40,
  max_deviation: 50,
  max_speed_percentile: 95,
  moving_min_speed: 1,
};

/** Le chiavi di `stats` che l'app sa calcolare: le altre vengono dal DEM, solo sul server. */
export type UgcTrackLocalStats = Pick<
  UgcTrackStats,
  'distance' | 'duration' | 'duration_moving' | 'avg_speed' | 'max_speed'
>;

const EARTH_RADIUS_M = 6371000;
/** Da m/s a km/h */
const MS_TO_KMH = 3.6;

type PointKind = 'invalid' | 'suspect' | 'good';

interface Segment {
  from: Location;
  to: Location;
  /** metri */
  d: number;
  dtValid: boolean;
  /** secondi */
  dt: number;
  /** km/h */
  v: number;
}

/**
 * Arrotonda come `round()` di PHP: metà lontano da zero, con il pre-arrotondamento a 15 cifre
 * significative (§2 «Arrotondamento»). Mai `Math.round(x * 10 ** d) / 10 ** d` né `toFixed`.
 *
 * @param x il valore da arrotondare
 * @param decimals il numero di decimali
 * @returns il valore arrotondato
 */
export function phpRound(x: number, decimals: number): number {
  const f = 10 ** decimals;
  const y = Number((Math.abs(x) * f).toPrecision(15));
  return (Math.sign(x) * Math.round(y)) / f;
}

/**
 * Percentile nearest-rank (§4): sempre uno dei valori, senza interpolazione.
 *
 * @param values i valori
 * @param p il percentile, in (0, 100]
 * @returns il valore al rango richiesto, `null` se `values` è vuoto
 */
export function percentileNearestRank(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const rank = Math.min(Math.max(1, Math.ceil((p / 100) * n)), n);
  return sorted[rank - 1];
}

/**
 * Distanza haversine in metri con R = 6.371.000 m (§2 c), non quella di OpenLayers.
 *
 * @param a il primo punto
 * @param b il secondo punto
 * @returns la distanza in metri
 */
export function haversineMeters(
  a: Pick<Location, 'latitude' | 'longitude'>,
  b: Pick<Location, 'latitude' | 'longitude'>,
): number {
  const phi1 = rad(a.latitude);
  const phi2 = rad(b.latitude);
  const dPhi = phi2 - phi1;
  const dLambda = rad(b.longitude - a.longitude);
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Lunghezza di una geometria in km, con la stessa haversine e lo stesso arrotondamento di
 * `distance`. Serve per le tracce senza `locations` (file caricati) e per la plancia.
 *
 * @param coordinates coordinate `[lon, lat, …]`
 * @returns km a 2 decimali, `null` con meno di 2 coordinate
 */
export function lineLengthKm(coordinates: number[][] | null | undefined): number | null {
  if (!coordinates || coordinates.length < 2) {
    return null;
  }
  let meters = 0;
  for (let i = 1; i < coordinates.length; i++) {
    meters += haversineMeters(
      {longitude: coordinates[i - 1][0], latitude: coordinates[i - 1][1]},
      {longitude: coordinates[i][0], latitude: coordinates[i][1]},
    );
  }
  return phpRound(meters / 1000, 2);
}

/**
 * Punti tenuti dalla pulizia GPS (§2 a), un booleano per punto nello stesso ordine.
 *
 * @param locations i punti registrati, così come sono
 * @param params i parametri della pulizia
 * @returns `true` per i punti tenuti
 */
export function isKeptLocations(locations: Location[], params: UgcTrackStatsParams): boolean[] {
  const kinds = locations.map(p => pointKind(p, params));
  const kept: boolean[] = [];
  let leftAnchor: Location | null = null;
  for (let i = 0; i < locations.length; i++) {
    if (kinds[i] === 'invalid') {
      kept.push(false);
      continue;
    }
    if (kinds[i] === 'good') {
      kept.push(true);
      leftAnchor = locations[i];
      continue;
    }
    let rightAnchor: Location | null = null;
    for (let j = i + 1; j < locations.length; j++) {
      if (kinds[j] === 'good') {
        rightAnchor = locations[j];
        break;
      }
    }
    const keep = isSuspectKept(locations[i], leftAnchor, rightAnchor, params);
    kept.push(keep);
    if (keep) {
      leftAnchor = locations[i];
    }
  }
  return kept;
}

/**
 * Dati tecnici calcolabili in locale (§3), sui soli punti tenuti.
 *
 * @param kept i punti tenuti, nell'ordine di registrazione
 * @param params i parametri del calcolo
 * @returns le cinque chiavi arrotondate come sul server, `null` con meno di 2 punti
 */
export function computeUgcTrackLocalStats(
  kept: Location[],
  params: UgcTrackStatsParams,
): UgcTrackLocalStats | null {
  if (!kept || kept.length < 2) {
    return null;
  }
  const segments = buildSegments(kept);

  let meters = 0;
  let movingSeconds = 0;
  let hasTimed = false;
  let goodMeters = 0;
  let goodSeconds = 0;
  const segmentSpeeds: number[] = [];
  segments.forEach(s => {
    meters += s.d;
    if (!s.dtValid) {
      return;
    }
    hasTimed = true;
    segmentSpeeds.push(s.v);
    if (s.v < params.moving_min_speed) {
      return;
    }
    movingSeconds += s.dt;
    if (hasGoodAccuracy(s.from, params) && hasGoodAccuracy(s.to, params)) {
      goodMeters += s.d;
      goodSeconds += s.dt;
    }
  });

  const times = kept.filter(p => isNum(p.time)).map(p => p.time as number);
  let duration: number | null = null;
  if (times.length >= 2) {
    const seconds = (times[times.length - 1] - times[0]) / 1000;
    duration = seconds > 0 ? phpRound(seconds / 60, 0) : null;
  }

  let speeds = kept.filter(p => isNum(p.speed) && p.speed >= 0).map(p => p.speed as number);
  if (speeds.length === 0) {
    speeds = segmentSpeeds;
  }
  const q = percentileNearestRank(speeds, params.max_speed_percentile);

  return {
    distance: phpRound(meters / 1000, 2),
    duration,
    duration_moving: hasTimed ? phpRound(movingSeconds / 60, 0) : null,
    avg_speed: goodSeconds > 0 ? phpRound((goodMeters / goodSeconds) * MS_TO_KMH, 1) : null,
    max_speed: q == null ? null : phpRound(q, 1),
  };
}

/** Le chiavi di `stats` che il server prende dal DEM (§5). */
export type UgcTrackElevation = Pick<
  UgcTrackStats,
  'ascent' | 'descent' | 'ele_min' | 'ele_max'
>;

/**
 * Dislivelli e quote dalla quota GPS dei punti tenuti. Si mostrano solo finché la traccia non
 * ha lo `stats` del server, che usa il DEM e dà altri numeri (§5, §10).
 *
 * @param kept i punti tenuti
 * @returns metri interi; dislivelli `null` se nessuna coppia di punti consecutivi ha la quota,
 * quote `null` se nessun punto ce l'ha
 */
export function gpsElevationMeters(kept: Location[]): UgcTrackElevation {
  let ascent = 0;
  let descent = 0;
  let hasPair = false;
  for (let i = 1; i < kept.length; i++) {
    const a = kept[i - 1].altitude;
    const b = kept[i].altitude;
    if (!isNum(a) || !isNum(b)) {
      continue;
    }
    hasPair = true;
    if (b > a) {
      ascent += b - a;
    } else {
      descent += a - b;
    }
  }
  const altitudes = kept.map(p => p.altitude).filter(isNum);
  const meters = (value: number | undefined): number | null =>
    value == null ? null : phpRound(value, 0);
  return {
    ascent: hasPair ? phpRound(ascent, 0) : null,
    descent: hasPair ? phpRound(descent, 0) : null,
    ele_min: meters(altitudes.length ? altitudes.reduce((m, v) => Math.min(m, v)) : undefined),
    ele_max: meters(altitudes.length ? altitudes.reduce((m, v) => Math.max(m, v)) : undefined),
  };
}

/**
 * La stessa pulizia di `isKeptLocations`, applicata un punto alla volta durante la
 * registrazione. Un punto buono si tiene subito; un sospetto resta in attesa finché non arriva il
 * primo punto buono successivo, che gli fa da ancora destra (§2 a). Alla fine,
 * `keptIfStoppedNow()` dà gli stessi punti di `isKeptLocations` sull'intera lista.
 */
export class UgcTrackCleaner {
  private _kept: Location[] = [];
  private _leftAnchor: Location | null = null;
  private _pending: Location[] = [];

  constructor(private readonly _params: UgcTrackStatsParams) {}

  /** Punti tenuti decisi finora, esclusi i sospetti in attesa. */
  get kept(): Location[] {
    return this._kept;
  }

  /**
   * Aggiunge un punto.
   *
   * @param location il punto appena registrato
   * @returns i punti tenuti decisi da questo push (0, 1 o più), in ordine
   */
  push(location: Location): Location[] {
    const kind = pointKind(location, this._params);
    if (kind === 'invalid') {
      return [];
    }
    if (kind === 'suspect') {
      this._pending.push(location);
      return [];
    }
    const decided = this._decidePending(location);
    decided.push(location);
    this._pending = [];
    this._leftAnchor = location;
    this._kept = this._kept.concat(decided);
    return decided;
  }

  /**
   * Punti tenuti se la registrazione finisse ora: i sospetti in attesa si decidono senza ancora
   * destra, come fa la funzione completa in coda alla lista. Non modifica lo stato.
   *
   * @returns tutti i punti tenuti
   */
  keptIfStoppedNow(): Location[] {
    return this._kept.concat(this._decidePending(null));
  }

  private _decidePending(rightAnchor: Location | null): Location[] {
    const kept: Location[] = [];
    let left = this._leftAnchor;
    this._pending.forEach(p => {
      if (isSuspectKept(p, left, rightAnchor, this._params)) {
        kept.push(p);
        left = p;
      }
    });
    return kept;
  }
}

/**
 * I dati tecnici da mostrare per una traccia: quelli del server se ci sono, altrimenti locali.
 * Dislivelli e quote vengono dal DEM se `source` è `server`, dalla quota GPS altrimenti; `distance`
 * è `null` solo per una traccia senza punti.
 */
export type UgcTrackDetails = Pick<
  UgcTrackStats,
  'duration' | 'duration_moving' | 'avg_speed' | 'max_speed'
> &
  UgcTrackElevation & {
    distance: number | null;
    source: 'server' | 'local';
  };

/**
 * Parametri effettivi, con la stessa regola del server (§7): un valore assente, non numerico o
 * ≤ 0 (per il percentile anche > 100) fa valere il default.
 *
 * @param conf `GEOLOCATION.record.stats` di `config.json`
 * @returns i quattro parametri
 */
export function resolveUgcTrackStatsParams(
  conf?: Partial<UgcTrackStatsParams> | null,
): UgcTrackStatsParams {
  const resolved = {...UGC_TRACK_STATS_DEFAULT_PARAMS};
  (Object.keys(resolved) as (keyof UgcTrackStatsParams)[]).forEach(key => {
    const value = conf?.[key];
    const valid = isNum(value) && value > 0 && (key !== 'max_speed_percentile' || value <= 100);
    if (valid) {
      resolved[key] = value;
    }
  });
  return resolved;
}

/**
 * Dati tecnici di una traccia UGC: `properties.stats` del server quando c'è, altrimenti calcolati
 * al volo dai `locations` con la stessa pulizia; senza `locations` (file caricati) solo la
 * distanza della geometria.
 *
 * @param track la traccia
 * @param params i parametri del calcolo locale
 * @returns i valori da mostrare, `null` dove non calcolabili
 */
export function ugcTrackDetails(
  track: WmFeature<LineString>,
  params: UgcTrackStatsParams,
): UgcTrackDetails {
  const properties = track?.properties ?? {};
  const stats: UgcTrackStats | undefined = properties.stats;
  if (stats) {
    return {
      distance: stats.distance,
      duration: stats.duration,
      duration_moving: stats.duration_moving,
      avg_speed: stats.avg_speed,
      max_speed: stats.max_speed,
      ascent: stats.ascent,
      descent: stats.descent,
      ele_min: stats.ele_min,
      ele_max: stats.ele_max,
      source: 'server',
    };
  }
  const locations: Location[] = Array.isArray(properties.locations) ? properties.locations : [];
  const flags = isKeptLocations(locations, params);
  const kept = locations.filter((_, i) => flags[i]);
  const local = computeUgcTrackLocalStats(kept, params);
  if (local) {
    return {...local, ...gpsElevationMeters(kept), source: 'local'};
  }
  return {
    distance: lineLengthKm(track?.geometry?.coordinates),
    duration: null,
    duration_moving: null,
    avg_speed: null,
    max_speed: null,
    ascent: null,
    descent: null,
    ele_min: null,
    ele_max: null,
    source: 'local',
  };
}

/**
 * Coordinate `[lon, lat, alt]` della geometria da salvare per una registrazione: i punti tenuti
 * dalla pulizia; con meno di 2 punti tenuti (per esempio GPS tutto oltre `max_accuracy`) i punti
 * grezzi validi, perché una geometria vuota non si salva e la registrazione andrebbe persa. Dopo la
 * sincronizzazione vince comunque la geometria del server.
 *
 * @param kept i punti tenuti
 * @param locations tutti i punti registrati
 * @returns le coordinate della geometria
 */
export function recordedGeometryCoordinates(kept: Location[], locations: Location[]): number[][] {
  const points = kept.length >= 2 ? kept : (locations ?? []).filter(p => isValidLocation(p));
  return points.map(p => [p.longitude, p.latitude, p.altitude ?? 0]);
}

/**
 * Un punto con coordinate utilizzabili: numeriche, nel range e diverse da (0,0) (§2 a).
 *
 * @param p il punto
 * @returns `true` se il punto non è invalido
 */
export function isValidLocation(p: Location): boolean {
  return (
    p != null &&
    typeof p === 'object' &&
    isNum(p.latitude) &&
    isNum(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180 &&
    !(p.latitude === 0 && p.longitude === 0)
  );
}

/**
 * Gradi in radianti.
 *
 * @param x angolo in gradi
 * @returns angolo in radianti
 */
function rad(x: number): number {
  return (x * Math.PI) / 180;
}

/**
 * «Numerico» nel senso della specifica (§2): un numero finito.
 *
 * @param v il valore
 * @returns `true` se è un numero finito
 */
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Tipo del punto per la pulizia (§2 a): invalido, sospetto (accuracy oltre `max_accuracy`) o buono.
 *
 * @param p il punto
 * @param params i parametri della pulizia
 * @returns il tipo del punto
 */
function pointKind(p: Location, params: UgcTrackStatsParams): PointKind {
  if (!isValidLocation(p)) {
    return 'invalid';
  }
  if (isNum(p.accuracy) && p.accuracy >= 0 && p.accuracy > params.max_accuracy) {
    return 'suspect';
  }
  return 'good';
}

/**
 * Decide un sospetto (§2 a): si tiene se dista al più `max_deviation` dal tratto fra l'ancora
 * sinistra (ultimo punto tenuto) e l'ancora destra (primo punto buono successivo).
 *
 * @param p il sospetto
 * @param leftAnchor l'ultimo punto tenuto, se c'è
 * @param rightAnchor il primo punto buono successivo, se c'è
 * @param params i parametri della pulizia
 * @returns `true` se il sospetto si tiene
 */
function isSuspectKept(
  p: Location,
  leftAnchor: Location | null,
  rightAnchor: Location | null,
  params: UgcTrackStatsParams,
): boolean {
  if (leftAnchor == null && rightAnchor == null) {
    return false;
  }
  const from = leftAnchor ?? rightAnchor;
  const to = rightAnchor ?? leftAnchor;
  return pointToSegmentMeters(p, from, to) <= params.max_deviation;
}

/**
 * Distanza punto-segmento in metri, con una proiezione piana locale centrata su P (§2 a).
 *
 * @param p il punto
 * @param a un estremo del segmento
 * @param b l'altro estremo
 * @returns la distanza in metri
 */
function pointToSegmentMeters(p: Location, a: Location, b: Location): number {
  const c = Math.cos(rad((p.latitude + a.latitude + b.latitude) / 3));
  const ax = rad(a.longitude - p.longitude) * c * EARTH_RADIUS_M;
  const ay = rad(a.latitude - p.latitude) * EARTH_RADIUS_M;
  const bx = rad(b.longitude - p.longitude) * c * EARTH_RADIUS_M;
  const by = rad(b.latitude - p.latitude) * EARTH_RADIUS_M;
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/**
 * Tratti fra punti tenuti consecutivi, con lunghezza, Δt e velocità (§2 b-d).
 *
 * @param kept i punti tenuti
 * @returns i tratti
 */
function buildSegments(kept: Location[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < kept.length; i++) {
    const from = kept[i - 1];
    const to = kept[i];
    const d = haversineMeters(from, to);
    const dt = isNum(from.time) && isNum(to.time) ? (to.time - from.time) / 1000 : 0;
    const dtValid = dt > 0;
    segments.push({from, to, d, dtValid, dt, v: dtValid ? (d / dt) * MS_TO_KMH : 0});
  }
  return segments;
}

/**
 * GPS buono per la media (§2 f): accuracy numerica e ≤ `max_accuracy`; un'accuracy assente non
 * è buona.
 *
 * @param p il punto
 * @param params i parametri del calcolo
 * @returns `true` se l'accuracy è buona
 */
function hasGoodAccuracy(p: Location, params: UgcTrackStatsParams): boolean {
  return isNum(p.accuracy) && p.accuracy <= params.max_accuracy;
}
