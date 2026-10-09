import {Location, UgcTrackStats, WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {UgcTrackStatsParams} from '@wm-core/types/config';
import {
  UGC_TRACK_STATS_DEFAULT_PARAMS,
  UgcTrackCleaner,
  UgcTrackLocalStats,
  computeUgcTrackLocalStats,
  gpsElevationMeters,
  isKeptLocations,
  percentileNearestRank,
  phpRound,
  recordedGeometryCoordinates,
  resolveUgcTrackStatsParams,
  ugcTrackDetails,
} from './ugc-track-stats';
import f01 from './fixtures/ugc-track-stats/01-cammino-regolare.json';
import f02 from './fixtures/ugc-track-stats/02-sosta-distance-filter.json';
import f03 from './fixtures/ugc-track-stats/03-gps-disturbato-tenuto.json';
import f04 from './fixtures/ugc-track-stats/04-punto-scartato.json';
import f05 from './fixtures/ugc-track-stats/05-due-punti-di-cui-uno-scartato.json';
import f06 from './fixtures/ugc-track-stats/06-senza-speed.json';
import f07 from './fixtures/ugc-track-stats/07-time-mancante-o-non-crescente.json';
import f08 from './fixtures/ugc-track-stats/08-sospetto-scartato.json';
import f09 from './fixtures/ugc-track-stats/09-nessun-tratto-buono.json';

export interface UgcTrackStatsFixture {
  description: string;
  params: UgcTrackStatsParams;
  locations: Location[];
  expected_kept: boolean[];
  expected: UgcTrackLocalStats | null;
}

/** Casi condivisi con wm-package (vedi il README della cartella fixtures). */
export const UGC_TRACK_STATS_FIXTURES: {[name: string]: UgcTrackStatsFixture} = {
  '01-cammino-regolare': f01 as unknown as UgcTrackStatsFixture,
  '02-sosta-distance-filter': f02 as unknown as UgcTrackStatsFixture,
  '03-gps-disturbato-tenuto': f03 as unknown as UgcTrackStatsFixture,
  '04-punto-scartato': f04 as unknown as UgcTrackStatsFixture,
  '05-due-punti-di-cui-uno-scartato': f05 as unknown as UgcTrackStatsFixture,
  '06-senza-speed': f06 as unknown as UgcTrackStatsFixture,
  '07-time-mancante-o-non-crescente': f07 as unknown as UgcTrackStatsFixture,
  '08-sospetto-scartato': f08 as unknown as UgcTrackStatsFixture,
  '09-nessun-tratto-buono': f09 as unknown as UgcTrackStatsFixture,
};

describe('ugc-track-stats — casi condivisi con wm-package (oc:8743)', () => {
  Object.keys(UGC_TRACK_STATS_FIXTURES).forEach(name => {
    const f = UGC_TRACK_STATS_FIXTURES[name];

    it(`${name}: punti tenuti`, () => {
      expect(isKeptLocations(f.locations, f.params)).toEqual(f.expected_kept);
    });

    it(`${name}: dati tecnici`, () => {
      const kept = f.locations.filter((_, i) => f.expected_kept[i]);
      expect(computeUgcTrackLocalStats(kept, f.params)).toEqual(f.expected);
    });
  });
});

describe('ugc-track-stats — phpRound e percentile (oc:8743)', () => {
  it('arrotonda la metà lontano da zero, con il pre-arrotondamento di PHP', () => {
    expect(phpRound(1.005, 2)).toBe(1.01);
    expect(phpRound(0.285, 2)).toBe(0.29);
    expect(phpRound(1.45, 1)).toBe(1.5);
    expect(phpRound(2.5, 0)).toBe(3);
    expect(phpRound(-2.5, 0)).toBe(-3);
  });

  it('percentile nearest-rank: esempio della specifica', () => {
    const values = [3.1, 4.0, 2.2, 5.5, 3.8, 4.4, 3.9, 12.0, 4.1, 3.5];
    expect(percentileNearestRank(values, 95)).toBe(12.0);
    expect(percentileNearestRank([], 95)).toBeNull();
  });
});

describe('UgcTrackCleaner — pulizia incrementale (oc:8743)', () => {
  const params = UGC_TRACK_STATS_DEFAULT_PARAMS;
  const good = (lat: number, time: number): Location => ({
    latitude: lat,
    longitude: 13,
    accuracy: 5,
    time,
  });
  const suspect = (lat: number, time: number): Location => ({
    latitude: lat,
    longitude: 13,
    accuracy: 45,
    time,
  });
  // ~11 m di latitudine
  const step = 0.0001;

  Object.keys(UGC_TRACK_STATS_FIXTURES).forEach(name => {
    it(`${name}: alla fine tiene gli stessi punti della funzione completa`, () => {
      const f = UGC_TRACK_STATS_FIXTURES[name];
      const cleaner = new UgcTrackCleaner(f.params);
      f.locations.forEach(l => {
        cleaner.push(l);
        const preview = cleaner.keptIfStoppedNow();
        expect(preview.slice(0, cleaner.kept.length)).toEqual(cleaner.kept);
      });
      expect(cleaner.keptIfStoppedNow()).toEqual(f.locations.filter((_, i) => f.expected_kept[i]));
    });
  });

  it('keptIfStoppedNow non cambia lo stato (salvataggio annullato e registrazione ripresa)', () => {
    const a = new UgcTrackCleaner(params);
    const b = new UgcTrackCleaner(params);
    [good(43, 0), suspect(43 + step, 10000)].forEach(l => {
      a.push(l);
      b.push(l);
    });
    a.keptIfStoppedNow();
    expect(a.push(good(43 + 2 * step, 20000))).toEqual(b.push(good(43 + 2 * step, 20000)));
    expect(a.kept).toEqual(b.kept);
  });

  it('un primo punto (0,0) non viene mai tenuto', () => {
    const cleaner = new UgcTrackCleaner(params);
    expect(cleaner.push({latitude: 0, longitude: 0, accuracy: 5})).toEqual([]);
    cleaner.push(good(43, 0));
    expect(cleaner.kept).toEqual([good(43, 0)]);
  });

  it('un punto buono dopo due sospetti restituisce i sospetti tenuti e il buono, in ordine', () => {
    const cleaner = new UgcTrackCleaner(params);
    cleaner.push(good(43, 0));
    expect(cleaner.push(suspect(43 + step, 10000))).toEqual([]);
    expect(cleaner.push(suspect(43 + 2 * step, 20000))).toEqual([]);
    expect(cleaner.kept.length).toBe(1);
    expect(cleaner.push(good(43 + 3 * step, 30000))).toEqual([
      suspect(43 + step, 10000),
      suspect(43 + 2 * step, 20000),
      good(43 + 3 * step, 30000),
    ]);
  });
});

describe('ugcTrackDetails — stats del server o calcolo locale (oc:8743)', () => {
  const params = UGC_TRACK_STATS_DEFAULT_PARAMS;
  const stats174: UgcTrackStats = {
    distance: 9.37,
    ascent: 313,
    descent: 610,
    ele_min: 935,
    ele_max: 1456,
    ele_from: 1236,
    ele_to: 939,
    duration: 165,
    duration_moving: 144,
    avg_speed: 3.4,
    max_speed: 6.5,
    computed_at: '2026-10-08T11:42:47Z',
  };
  const track = (properties: any, coordinates: number[][] = []): WmFeature<LineString> =>
    ({type: 'Feature', geometry: {type: 'LineString', coordinates}, properties} as any);

  it('con stats mostra i valori del server', () => {
    expect(ugcTrackDetails(track({stats: stats174, locations: []}), params)).toEqual({
      distance: 9.37,
      duration: 165,
      duration_moving: 144,
      avg_speed: 3.4,
      max_speed: 6.5,
      ascent: 313,
      descent: 610,
      ele_min: 935,
      ele_max: 1456,
      source: 'server',
    });
  });

  it('con stats e ascent null (DEM non pronto) il dislivello resta null', () => {
    const details = ugcTrackDetails(track({stats: {...stats174, ascent: null}}), params);
    expect(details.ascent).toBeNull();
    expect(details.source).toBe('server');
  });

  it('senza stats calcola dai locations con la pulizia', () => {
    const f = UGC_TRACK_STATS_FIXTURES['04-punto-scartato'];
    const details = ugcTrackDetails(track({locations: f.locations}), f.params);
    expect(details).toEqual(jasmine.objectContaining({...f.expected, source: 'local'}));
    expect(details.ascent).toBe(0);
  });

  it('senza stats e senza locations usa la geometria per la distanza', () => {
    const details = ugcTrackDetails(
      track({}, [
        [13, 43, 0],
        [13, 43.00008993216059, 0],
      ]),
      params,
    );
    expect(details).toEqual({
      distance: 0.01,
      duration: null,
      duration_moving: null,
      avg_speed: null,
      max_speed: null,
      ascent: null,
      descent: null,
      ele_min: null,
      ele_max: null,
      source: 'local',
    });
  });

  it('quote GPS: dislivelli solo fra punti consecutivi con la quota, minimo e massimo da tutti i punti', () => {
    const at = (altitude?: number): Location => ({altitude} as Location);
    expect(gpsElevationMeters([at(100), at(), at(120.4), at(90), at(110.6), at()])).toEqual({
      ascent: 21,
      descent: 30,
      ele_min: 90,
      ele_max: 120,
    });
  });

  it('quote GPS: senza quote tutto null', () => {
    const noAltitude = [{} as Location, {} as Location];
    expect(gpsElevationMeters(noAltitude)).toEqual({
      ascent: null,
      descent: null,
      ele_min: null,
      ele_max: null,
    });
  });

  it('parametri: default se mancano, valori di config se numerici', () => {
    expect(resolveUgcTrackStatsParams(undefined)).toEqual(UGC_TRACK_STATS_DEFAULT_PARAMS);
    expect(resolveUgcTrackStatsParams({max_accuracy: 30})).toEqual({
      max_accuracy: 30,
      max_deviation: 50,
      max_speed_percentile: 95,
      moving_min_speed: 1,
    });
  });

  it('parametri: 0, negativi e percentile oltre 100 fanno valere il default (§7)', () => {
    expect(
      resolveUgcTrackStatsParams({
        max_accuracy: 0,
        max_deviation: -5,
        max_speed_percentile: 120,
        moving_min_speed: NaN,
      }),
    ).toEqual(UGC_TRACK_STATS_DEFAULT_PARAMS);
    expect(resolveUgcTrackStatsParams({max_speed_percentile: 100}).max_speed_percentile).toBe(100);
  });
});

describe('recordedGeometryCoordinates — geometria da salvare (oc:8743)', () => {
  const p = (lat: number, accuracy: number): Location => ({
    latitude: lat,
    longitude: 13,
    accuracy,
    altitude: 7,
  });

  it('con almeno 2 punti tenuti usa i punti tenuti', () => {
    const kept = [p(43, 5), p(43.001, 5)];
    expect(recordedGeometryCoordinates(kept, [...kept, p(44, 3000)])).toEqual([
      [13, 43, 7],
      [13, 43.001, 7],
    ]);
  });

  it('con meno di 2 punti tenuti (GPS tutto sospetto) usa i punti grezzi validi, mai una geometria vuota', () => {
    const locations = [{latitude: 0, longitude: 0, accuracy: 100}, p(43, 100), p(43.001, 120)];
    expect(recordedGeometryCoordinates([], locations)).toEqual([
      [13, 43, 7],
      [13, 43.001, 7],
    ]);
  });
});
