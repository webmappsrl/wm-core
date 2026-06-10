import {Feature, LineString} from 'geojson';

import {IPoint} from '../types/model';
import {Injectable} from '@angular/core';
import {Location} from '@wm-types/feature';
import {ILAYER} from '@wm-core/types/config';
import {FeatureLike} from 'ol/Feature';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat, toLonLat} from 'ol/proj';
import RenderFeature, {toFeature} from 'ol/render/Feature';
import {getDistance} from 'ol/sphere';

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
