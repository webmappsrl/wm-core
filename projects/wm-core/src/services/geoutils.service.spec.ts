import {GeoutilsService} from './geoutils.service';
import {ILAYER} from '@wm-core/types/config';
import {Location} from '@wm-types/feature';
import {fromLonLat} from 'ol/proj';
import {LineString} from 'geojson';

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

describe('GeoutilsService — distanza rimanente (oc:8177)', () => {
  let service: GeoutilsService;

  beforeEach(() => {
    service = new GeoutilsService();
  });

  function lineString(coordinates: Array<[number, number]>): LineString {
    return {type: 'LineString', coordinates};
  }

  function location(lon: number, lat: number): Location {
    return {longitude: lon, latitude: lat} as Location;
  }

  // Traccia rettilinea semplice: A-B e B-C hanno (quasi) la stessa lunghezza (~1112 m ciascuno).
  const A: [number, number] = [9, 45.0];
  const B: [number, number] = [9, 45.01];
  const C: [number, number] = [9, 45.02];
  const simpleTrack = lineString([A, B, C]);

  describe('getHaversineTrackLength', () => {
    it('somma le distanze haversine tra coordinate consecutive', () => {
      const length = service.getHaversineTrackLength(simpleTrack);
      expect(length).toBeCloseTo(2223.9, 0);
    });

    it('ritorna 0 per una geometria senza coordinate', () => {
      expect(service.getHaversineTrackLength(lineString([]))).toBe(0);
    });
  });

  describe('prepareRemainingDistanceContext', () => {
    it('ritorna null per una traccia con meno di 2 punti', () => {
      expect(service.prepareRemainingDistanceContext(lineString([A]))).toBeNull();
      expect(service.prepareRemainingDistanceContext(lineString([]))).toBeNull();
    });

    it('il trackLength del contesto coincide con getHaversineTrackLength (stessa fonte, vedi oc:8177)', () => {
      const context = service.prepareRemainingDistanceContext(simpleTrack);
      expect(context?.trackLength).toBe(service.getHaversineTrackLength(simpleTrack));
    });
  });

  describe('getRemainingDistance', () => {
    it('ritorna null se il contesto è null', () => {
      expect(service.getRemainingDistance(location(9, 45.0), null as any, null, null)).toBeNull();
    });

    it('calcola distanza rimanente e avanzamento su una traccia rettilinea semplice', () => {
      const context = service.prepareRemainingDistanceContext(simpleTrack)!;
      // Posizione GPS esattamente sul punto medio B: metà del percorso già fatta.
      const result = service.getRemainingDistance(location(9, 45.01), context, null, null);

      expect(result).not.toBeNull();
      expect(result!.trackProgress).toBeCloseTo(0.5, 2);
      expect(result!.remainingDistance).toBeCloseTo(context.trackLength / 2, 0);
      expect(result!.distanceFromTrack).toBeCloseTo(0, 0);
    });

    it('ritorna null se la posizione GPS è a più di 100m dalla traccia', () => {
      const context = service.prepareRemainingDistanceContext(simpleTrack)!;
      // ~500m ad est della traccia (offset in longitudine a lat 45°) — ben oltre la soglia.
      const farAway = location(9 + 0.0064, 45.005);

      expect(service.getRemainingDistance(farAway, context, null, null)).toBeNull();
    });

    it('non ritorna null se la posizione GPS è entro 100m dalla traccia', () => {
      const context = service.prepareRemainingDistanceContext(simpleTrack)!;
      // ~10m ad est della traccia — ben entro la soglia.
      const nearby = location(9 + 0.00013, 45.005);

      expect(service.getRemainingDistance(nearby, context, null, null)).not.toBeNull();
    });

    it(
      'con lastKnownProgress vincola la ricerca a una finestra locale, evitando di tornare ' +
        "all'inizio della traccia su percorsi che si autointersecano (anti-oscillazione, vedi oc:8177)",
      () => {
        // Traccia che esce e torna quasi sullo stesso punto di partenza (P2 è ~1.1m da P0,
        // ma a metà del percorso in termini di distanza percorsa: P0->P1->P2->P3).
        const P0: [number, number] = [10, 45.0];
        const P1: [number, number] = [10, 45.02];
        const P2: [number, number] = [10, 45.00001];
        const P3: [number, number] = [10, 45.03];
        const loopTrack = lineString([P0, P1, P2, P3]);
        const context = service.prepareRemainingDistanceContext(loopTrack)!;
        const gpsAtP0 = location(10, 45.0);

        // Senza un progress noto (es. primo fix GPS sulla traccia), la ricerca è globale e
        // trova correttamente il punto più vicino in assoluto: P0 stesso (distanza 0).
        const globalResult = service.getRemainingDistance(gpsAtP0, context, null, null);
        expect(globalResult!.trackProgress).toBeCloseTo(0, 2);

        // Con un progress noto vicino a P2 (~0.571, il punto dove il percorso si intreccia con
        // l'inizio), la ricerca locale esclude il segmento P0-P1 e trova correttamente P2,
        // anche se la posizione GPS coincide esattamente con P0.
        const knownProgressNearP2 = context.trackLength
          ? (service.getHaversineTrackLength(lineString([P0, P1, P2])) as number) / context.trackLength
          : 0;
        const localResult = service.getRemainingDistance(
          gpsAtP0,
          context,
          knownProgressNearP2,
          10,
        );
        expect(localResult!.trackProgress).toBeCloseTo(knownProgressNearP2, 2);
        expect(localResult!.trackProgress).toBeGreaterThan(0.5);
      },
    );
  });
});
