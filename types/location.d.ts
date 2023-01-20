export interface ILocation {
  accuracy?: number;
  altitude?: number;
  bearing?: number;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: number;

  getLatLng(): [number, number];
}

export interface IGeolocationServiceState {
  isActive: boolean;
  isLoading: boolean;
  isPaused: boolean;
  isRecording: boolean;
}
