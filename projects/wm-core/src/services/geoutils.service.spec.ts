import {GeoutilsService} from './geoutils.service';
import {ILAYER} from '@wm-core/types/config';
import {Location} from '@wm-types/feature';
import {fromLonLat} from 'ol/proj';

describe('GeoutilsService.pickNearestLayerFromFeatures', () => {
  let service: GeoutilsService;

  beforeEach(() => {
    service = new GeoutilsService();
  });

  function makeHomeLayers(ids: number[]): ILAYER[] {
    return ids.map(id => ({id: String(id), title: `Layer ${id}`} as ILAYER));
  }

  function makeFeature(layerIds: number[], closestLonLat: [number, number]) {
    return {
      get: (key: string) => (key === 'layers' ? JSON.stringify(layerIds) : null),
      getGeometry: () => ({
        getClosestPoint: () => fromLonLat(closestLonLat),
      }),
    };
  }

  const location: Location = {longitude: 15, latitude: 28} as Location;

  it('restituisce null se features è vuoto', () => {
    expect(service.pickNearestLayerFromFeatures([], location, makeHomeLayers([35]))).toBeNull();
  });

  it('restituisce null se location è null', () => {
    const features = [makeFeature([35], [15, 28])];
    expect(service.pickNearestLayerFromFeatures(features as any, null, makeHomeLayers([35]))).toBeNull();
  });

  it('restituisce il layer più vicino anche oltre 500 m', () => {
    const features = [makeFeature([35], [15.05, 28.05])];
    const result = service.pickNearestLayerFromFeatures(
      features as any,
      location,
      makeHomeLayers([35]),
    );
    expect(result?.id).toBe('35');
  });

  it('restituisce il layer con id corrispondente', () => {
    const features = [makeFeature([35], [15, 28])];
    const result = service.pickNearestLayerFromFeatures(
      features as any,
      location,
      makeHomeLayers([35, 81]),
    );
    expect(result?.id).toBe('35');
  });

  it('preferisce il layer più vicino tra più match', () => {
    const features = [makeFeature([81], [15.1, 28.1]), makeFeature([35], [15, 28])];
    const result = service.pickNearestLayerFromFeatures(
      features as any,
      location,
      makeHomeLayers([35, 81]),
    );
    expect(result?.id).toBe('35');
  });

  it('ignora layer non presenti in homeLayers', () => {
    const features = [makeFeature([999], [15, 28])];
    expect(
      service.pickNearestLayerFromFeatures(features as any, location, makeHomeLayers([35])),
    ).toBeNull();
  });
});
