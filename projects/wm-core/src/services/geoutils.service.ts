import {Injectable} from '@angular/core';
import {getDistance} from 'ol/sphere';
import {Coordinate} from 'ol/coordinate';
import {IPoint} from '../types/model';
import {Feature, LineString} from 'geojson';
@Injectable({
  providedIn: 'root',
})
export class GeoutilsService {
  private _maxCurrentSpeedPoint = 5;

  constructor() {}

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
   * Get the date when the track was recorded
   *
   * @param track a track feature
   */
  getDate(track: Feature<LineString>) {
    return new Date();
  }

  getDistance(point1: Coordinate, point2: Coordinate): number {
    return this._calcDistanceM(point1, point2);
  }

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

  getLocations(track: Feature<LineString>): any[] {
    const properties = track.properties;
    const locations = properties?.locations ?? null;
    return locations ?? [];
  }

  /**
   * Get the difference in height of a track
   *
   * @param {Feature<LineString>} track a track feature
   *
   * @returns {number} total height difference
   */
  getSlope(track: Feature<LineString>): number {
    const locations = this.getLocations(track);
    if (locations == null || locations.length < 2) {
      return 0;
    }

    let totalClimb = 0;

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const current = locations[i];

      // Calcola l'incertezza combinata considerando l'accuracy di entrambi i punti
      const combinedAccuracy =
        Math.max(prev.altitudeAccuracy || 0, current.altitudeAccuracy || 0) / 6;

      const altitudeDifference = current.altitude - prev.altitude;
      // Considera significative solo le variazioni di altitudine che superano l'incertezza combinata
      if (altitudeDifference > combinedAccuracy) {
        totalClimb += altitudeDifference;
      }
    }

    return totalClimb;
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

  /**
   * Converte gradi in radianti.
   * @param deg Gradi.
   * @returns Radianti.
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
