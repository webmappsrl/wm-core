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
  
export interface Location {
    accuracy?: number;
    altitude?: number;
    altitudeAccuracy?: number;
    bearing?: number;
    latitude: number;
    longitude: number;
    simulated?: boolean;
    speed?: number;
    time?: number;
}
  
  export interface IGeolocationServiceState {
    isActive: boolean;
    isLoading: boolean;
    isPaused: boolean;
    isRecording: boolean;
}
  