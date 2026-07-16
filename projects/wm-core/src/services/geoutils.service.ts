import {Feature, LineString, Position} from 'geojson';

import {IPoint} from '../types/model';
import {Injectable} from '@angular/core';
import {Location} from '@wm-types/feature';
import {ILAYER} from '@wm-core/types/config';
import {FeatureLike} from 'ol/Feature';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat, toLonLat} from 'ol/proj';
import RenderFeature, {toFeature} from 'ol/render/Feature';
import {getDistance} from 'ol/sphere';
import {
  REMAINING_DISTANCE_LOCAL_WINDOW_MIN_M,
  REMAINING_DISTANCE_LOCAL_WINDOW_RATIO,
  REMAINING_DISTANCE_MAX_SPEED_MS,
  REMAINING_DISTANCE_MIN_PLAUSIBLE_JUMP_M,
  REMAINING_DISTANCE_OFF_TRACK_THRESHOLD_M,
} from '../constants/track-remaining-distance';

export interface RemainingDistanceContext {
  coordinates3857: Coordinate[];
  cumulativeDistances: number[];
  trackLength: number;
}

export interface RemainingDistanceResult {
  remainingDistance: number;
  distanceCovered: number;
  trackProgress: number;
  distanceFromTrack: number;
}

@Injectable({
  providedIn: 'root',
})
export class GeoutilsService {
  private _maxCurrentSpeedPoint = 5;

  constructor() {}

  /**
   * Trova il layer home più vicino alla posizione GPS tra le feature VectorTile già caricate.
   *
   * @param features feature LineString/MultiLineString da VectorTileSource
   * @param location posizione GPS corrente
   * @param homeLayers layer visibili in home (confHOMELayers)
   * @returns il layer home più vicino alla posizione GPS, o null
   */
  pickNearestLayerFromFeatures(
    features: FeatureLike[],
    location: Location | null,
    homeLayers: ILAYER[],
  ): ILAYER | null {
    if (!features?.length || location == null || !homeLayers?.length) {
      return null;
    }

    const gpsLonLat: [number, number] = [location.longitude, location.latitude];
    const gps3857 = fromLonLat(gpsLonLat);
    const homeLayerById = new Map(homeLayers.map(l => [Number(l.id), l]));
    let bestLayer: ILAYER | null = null;
    let bestDist = Infinity;

    for (const raw of features) {
      const feature = raw instanceof RenderFeature ? toFeature(raw) : raw;
      const rawLayers = feature.get('layers');
      if (rawLayers == null) continue;

      let featureLayerIds: number[];
      try {
        featureLayerIds = JSON.parse(rawLayers) as number[];
      } catch {
        continue;
      }

      const matchingId = featureLayerIds.find(id => homeLayerById.has(id));
      if (matchingId == null) continue;

      const geom = feature.getGeometry();
      if (geom == null) continue;

      const closest3857 = geom.getClosestPoint(gps3857);
      const closestLonLat = toLonLat(closest3857) as [number, number];
      const dist = getDistance(gpsLonLat, closestLonLat);

      if (dist < bestDist) {
        bestDist = dist;
        bestLayer = homeLayerById.get(matchingId) ?? null;
      }
    }

    return bestLayer;
  }

  /**
   * Transform a second period into object with hours/minutes/seconds
   *
   * @param timeSeconds seconds to transform
   * @returns time as object
   */
  static formatTime(timeSeconds: number) {
    return {
      seconds: Math.floor(timeSeconds % 60),
      minutes: Math.floor(timeSeconds / 60) % 60,
      hours: Math.floor(timeSeconds / 3600),
    };
  }

  /**
   * Get the average speed on a track
   *
   * @param {Feature<LineString>} track a track feature
   * @returns {number} the average speed
   */
  getAverageSpeed(track: Feature<LineString>): number {
    const speeds = this.getSpeeds(track);
    const avgSpeed = speeds.reduce((a, curr) => a + curr, 0) / speeds.length;
    if (avgSpeed > 0) {
      return avgSpeed;
    }
    const time = this.getTime(track) / 3600;
    if (time > 0) return this.getLength(track) / time;
    return 0;
  }

  /**
   * Calculate the current speed on a track
   *
   * @param track a track feature
   * @returns
   */
  getCurrentSpeed(track: Feature<LineString>): number {
    if (!track || !track.geometry) return 0;
    const lenPoints = track.geometry.coordinates.length;
    const lenTimes = track.properties.metadata.locations.length;
    if (lenPoints >= 2 && lenTimes >= 2) {
      const maxIndex = Math.min(lenPoints, lenTimes, this._maxCurrentSpeedPoint);
      const dist = this._calcDistanceM(
        track.geometry.coordinates[lenPoints - 1] as IPoint,
        track.geometry.coordinates[lenPoints - maxIndex] as IPoint,
      );
      const timeS = this._calcTimeS(
        track.properties.metadata.locations[lenTimes - maxIndex].time,
        track.properties.metadata.locations[lenTimes - 1].time,
      );
      const speed = dist / 1000 / (timeS / 3600);
      return speed;
    }
    return 0;
  }

  /**
   * Calculate the distance in meters between two coordinates.
   *
   * @param point1 first coordinate
   * @param point2 second coordinate
   * @returns distance in meters
   */
  getDistance(point1: Coordinate, point2: Coordinate): number {
    return this._calcDistanceM(point1, point2);
  }

  /**
   * Get the first [lat, lon] point from a nested coordinate array.
   *
   * @param coordinates nested coordinate array
   * @returns first coordinate as [lat, lon]
   */
  getFirstPoint(coordinates: any): Coordinate {
    if (Array.isArray(coordinates) && typeof coordinates[0] == 'number') {
      return [coordinates[1], coordinates[0]];
    } else {
      return this.getFirstPoint(coordinates[0]);
    }
  }

  /**
   * Get the total length of a track
   *
   * @param track a track feature
   * @returns total length
   */
  getLength(track: Feature<LineString> | any): number {
    const coordinates =
      track?.geometry && track?.geometry?.coordinates
        ? track?.geometry?.coordinates
        : track.coordinates
        ? track.coordinates
        : [];
    if (coordinates.length >= 2) {
      let res = 0;
      for (let i = 1; i < coordinates.length; i++) {
        res += this._calcDistanceM(coordinates[i] as IPoint, coordinates[i - 1] as IPoint);
      }
      return res / 1000;
    }
    return 0;
  }

  /**
   * Lunghezza totale di una traccia, calcolata come somma delle distanze haversine tra
   * coordinate consecutive — stessa formula usata da SlopeChartComponent per l'asse del
   * grafico, in modo che i due valori restino sempre coerenti (vedi oc:8177).
   *
   * @param trackGeometry geometria della traccia (LineString, EPSG:4326)
   * @returns lunghezza totale in metri
   */
  getHaversineTrackLength(trackGeometry: LineString): number {
    const coordinates = trackGeometry?.coordinates ?? [];
    const cumulativeDistances = this._getCumulativeDistances(coordinates);
    return cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  }

  /**
   * Precalcola, una sola volta per traccia, la riproiezione in EPSG:3857 e le distanze
   * cumulative usate da `getRemainingDistance` — che altrimenti le ricalcolerebbe da zero
   * ad ogni fix GPS pur dipendendo solo dalla geometria, non dalla posizione utente. Il
   * risultato va cacheato dal chiamante per la durata della traccia corrente (vedi oc:8177).
   *
   * @param trackGeometry geometria della traccia (LineString, EPSG:4326)
   * @returns il contesto precalcolato, o null se la geometria non è valida
   */
  prepareRemainingDistanceContext(trackGeometry: LineString): RemainingDistanceContext | null {
    const coordinates = trackGeometry?.coordinates ?? [];
    if (coordinates.length < 2) {
      return null;
    }

    const cumulativeDistances = this._getCumulativeDistances(coordinates);

    return {
      coordinates3857: coordinates.map(c => fromLonLat([c[0], c[1]])),
      cumulativeDistances,
      trackLength: cumulativeDistances[cumulativeDistances.length - 1] ?? 0,
    };
  }

  /**
   * Proietta la posizione GPS corrente sulla geometria della traccia (già precalcolata via
   * `prepareRemainingDistanceContext`) e calcola la distanza rimanente fino alla fine del
   * percorso.
   *
   * La ricerca del punto più vicino è vincolata a una finestra locale attorno a
   * `lastKnownProgress` per evitare salti su tracce ad anello o con tratti sovrapposti; se lo
   * spostamento implicito supera la velocità massima plausibile di un camminatore, la ricerca
   * viene ripetuta sull'intera traccia (vedi oc:8177).
   *
   * @param userPosition posizione GPS corrente
   * @param trackContext contesto precalcolato da `prepareRemainingDistanceContext`
   * @param lastKnownProgress ultimo avanzamento noto (0-1), o null se non disponibile
   * @param elapsedSeconds secondi trascorsi dall'ultimo fix GPS noto
   * @returns distanza rimanente/avanzamento/distanza dalla traccia, o null se non calcolabile o a più di 100m dalla traccia
   */
  getRemainingDistance(
    userPosition: Location,
    trackContext: RemainingDistanceContext,
    lastKnownProgress: number | null,
    elapsedSeconds: number | null,
  ): RemainingDistanceResult | null {
    const {coordinates3857, cumulativeDistances, trackLength} = trackContext ?? {};
    if (coordinates3857 == null || coordinates3857.length < 2 || !trackLength) {
      return null;
    }

    const gps3857 = fromLonLat([userPosition.longitude, userPosition.latitude]);

    let result = this._findClosestPointAlongLine(
      coordinates3857,
      cumulativeDistances,
      gps3857,
      lastKnownProgress != null
        ? this._localSearchRange(lastKnownProgress * trackLength, trackLength, cumulativeDistances)
        : null,
    );

    if (lastKnownProgress != null) {
      const maxPlausibleJump = Math.max(
        REMAINING_DISTANCE_MIN_PLAUSIBLE_JUMP_M,
        REMAINING_DISTANCE_MAX_SPEED_MS * (elapsedSeconds ?? 0),
      );
      const impliedJump = Math.abs(result.distanceAlongLine - lastKnownProgress * trackLength);

      if (impliedJump > maxPlausibleJump) {
        result = this._findClosestPointAlongLine(coordinates3857, cumulativeDistances, gps3857, null);
      }
    }

    const distanceFromTrack = getDistance(
      toLonLat(gps3857) as [number, number],
      toLonLat(result.point) as [number, number],
    );

    if (distanceFromTrack > REMAINING_DISTANCE_OFF_TRACK_THRESHOLD_M) {
      return null;
    }

    return {
      remainingDistance: trackLength - result.distanceAlongLine,
      distanceCovered: result.distanceAlongLine,
      trackProgress: result.distanceAlongLine / trackLength,
      distanceFromTrack,
    };
  }

  getLocations(track: Feature<LineString>): Location[] {
    const properties = track.properties;
    const locations = properties?.locations ?? null;
    return locations ?? [];
  }

  /**
   * Get the difference in height of a track.
   * First tries to calculate the slope from locations because locations take the altitudeAccuracy and falls back to geometry if locations are not available.
   *
   * @param {Feature<LineString>} track a track feature
   * @returns {number} total height difference
   */
  getSlope(track: Feature<LineString>): number {
    const locations = this.getLocations(track);
    const hasLocation = locations != null && locations.length >= 2;
    if (hasLocation) {
      return this._getSlopeFromLocations(locations);
    }
    return this._getSlopeFromGeometry(track.geometry);
  }

  /**
   * Calculate the time in seconds needed to complete the given track
   *
   * @param track a track feature
   * @returns the time in seconds
   */
  getSpeeds(track: Feature<LineString>): number[] {
    const locations = this.getLocations(track);
    if (locations && locations.length > 1) {
      return locations.map(l => l.speed);
    }
    return [];
  }

  /**
   * Calculate the time in seconds needed to complete the given track
   *
   * @param track a track feature
   * @returns the time in seconds
   */
  getTime(track: Feature<LineString>): number {
    const locations = this.getLocations(track);
    if (locations && locations.length > 1) {
      return this._calcTimeS(locations[0].time, locations[locations.length - 1].time);
    }
    return 0;
  }

  /**
   * Get the top speed on all the track
   *
   * @param {Feature<LineString>} track a track feature
   *
   * @returns {number} top speed
   */
  getTopSpeed(track: Feature<LineString>): number {
    if (!track) return 0;
    const speeds = this.getSpeeds(track);
    return this._getMaxValue(speeds);
  }

  private _calcDistanceM(point1: Coordinate, point2: Coordinate): number {
    const p1 = [point1[0], point1[1]];
    const p2 = [point2[0], point2[1]];
    return getDistance(p1, p2);
  }

  /**
   * Punto più vicino a `p` sul segmento [a, b] (coordinate proiettate, es. EPSG:3857), con il
   * parametro `t` (0-1) della posizione lungo il segmento.
   */
  private _closestPointOnSegment(
    p: Coordinate,
    a: Coordinate,
    b: Coordinate,
  ): {point: Coordinate; t: number} {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const lenSq = abx * abx + aby * aby;
    const t =
      lenSq > 0
        ? Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lenSq))
        : 0;

    return {point: [a[0] + abx * t, a[1] + aby * t], t};
  }

  /**
   * Distanza cumulativa (haversine, metri) dall'inizio della linea per ogni vertice.
   */
  private _getCumulativeDistances(coordinates: Position[]): number[] {
    const cumulative = [0];
    for (let i = 1; i < coordinates.length; i++) {
      cumulative.push(cumulative[i - 1] + this._getHaversineDistance(coordinates[i - 1], coordinates[i]));
    }
    return cumulative;
  }

  /**
   * Punto più vicino a `gps3857` sui segmenti della linea nel range di indici `range`
   * (o su tutta la linea se `range` è null), con la distanza cumulativa dall'inizio della
   * linea fino a quel punto.
   */
  private _findClosestPointAlongLine(
    coordinates3857: Coordinate[],
    cumulativeDistances: number[],
    gps3857: Coordinate,
    range: [number, number] | null,
  ): {point: Coordinate; distanceAlongLine: number} {
    const [start, end] = range ?? [0, coordinates3857.length - 1];
    let best: {point: Coordinate; distanceAlongLine: number; distSq: number} | null = null;

    for (let i = start; i < end; i++) {
      const {point, t} = this._closestPointOnSegment(gps3857, coordinates3857[i], coordinates3857[i + 1]);
      const dx = gps3857[0] - point[0];
      const dy = gps3857[1] - point[1];
      const distSq = dx * dx + dy * dy;

      if (best == null || distSq < best.distSq) {
        const segmentLength = cumulativeDistances[i + 1] - cumulativeDistances[i];
        best = {point, distanceAlongLine: cumulativeDistances[i] + t * segmentLength, distSq};
      }
    }

    return {point: best.point, distanceAlongLine: best.distanceAlongLine};
  }

  /**
   * Distanza haversine (metri) tra due coordinate GeoJSON [lon, lat, alt?] — stessa formula
   * e raggio terrestre usati da SlopeChartComponent.getDistanceBetweenPoints, per garantire
   * risultati identici quando si somma sulla stessa geometria (vedi oc:8177).
   */
  private _getHaversineDistance(coord1: Position, coord2: Position): number {
    const R = 6371e3;
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Range di indici di vertice attorno a `targetDistance` (metri dall'inizio della linea)
   * largo `max(300m, 15% della lunghezza totale)`, usato per vincolare localmente la ricerca
   * del punto più vicino ed evitare salti su tracce ad anello (vedi oc:8177).
   */
  private _localSearchRange(
    targetDistance: number,
    trackLength: number,
    cumulativeDistances: number[],
  ): [number, number] {
    const windowMeters = Math.max(
      REMAINING_DISTANCE_LOCAL_WINDOW_MIN_M,
      trackLength * REMAINING_DISTANCE_LOCAL_WINDOW_RATIO,
    );
    const from = Math.max(0, targetDistance - windowMeters);
    const to = Math.min(trackLength, targetDistance + windowMeters);

    let startIndex = 0;
    let endIndex = cumulativeDistances.length - 1;
    while (
      startIndex < cumulativeDistances.length - 1 &&
      cumulativeDistances[startIndex + 1] < from
    ) {
      startIndex++;
    }
    while (endIndex > 0 && cumulativeDistances[endIndex - 1] > to) {
      endIndex--;
    }

    return [startIndex, Math.max(startIndex + 1, endIndex)];
  }

  private _calcTimeS(time1: number, time2: number): number {
    const res = (time2 - time1) / 1000;
    return res;
  }

  private _getMaxValue(numbers: number[]): number {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return 0;
    }

    let max = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] > max) {
        max = numbers[i];
      }
    }
    return max;
  }

  private _getSlopeFromGeometry(geometry: LineString): number {
    const coordinates = geometry?.coordinates ?? [];
    if (coordinates.length < 2) {
      return 0;
    }
    return coordinates.reduce((acc, curr, i, arr) => {
      if (i == 0) return acc;
      const difference = curr[2] - arr[i - 1][2];
      return acc + difference;
    }, 0);
  }

  private _getSlopeFromLocations(locations: Location[]): number {
    let slope = 0;

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const current = locations[i];

      // Calcola l'incertezza combinata considerando l'accuracy di entrambi i punti
      const combinedAccuracy =
        Math.max(prev.altitudeAccuracy || 0, current.altitudeAccuracy || 0) / 6;

      const altitudeDifference = current.altitude - prev.altitude;
      if (altitudeDifference > combinedAccuracy) {
        slope += altitudeDifference;
      }
    }

    return slope;
  }

}
