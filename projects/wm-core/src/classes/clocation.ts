import {ILocation} from '../types/location';

export class CLocation implements ILocation {
  public accuracy?: number;
  public altitude?: number;
  public bearing?: number;
  public latitude: number;
  public longitude: number;
  public speed?: number;
  public timestamp: number;

  constructor(
    longitude: number,
    latitude: number,
    altitude?: number,
    accuracy?: number,
    speed?: number,
    bearing?: number,
  ) {
    this.longitude = Math.round(longitude * 100000) / 100000;
    this.latitude = Math.round(latitude * 100000) / 100000;
    this.altitude = Math.round(altitude) || undefined;
    this.accuracy = Math.round(accuracy) || undefined;
    this.speed = Math.round(speed * 100) / 100 || undefined;
    this.bearing = Math.round(bearing) || undefined;
    this.timestamp = Date.now();
  }

  getLatLng(): [number, number] {
    return [this.latitude, this.longitude];
  }
}
