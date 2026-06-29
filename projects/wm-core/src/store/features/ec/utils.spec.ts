import {filterFeaturesByLayerId, hasLayerIdData, calculateLayerFeaturesCount} from './utils';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';

const makePoi = (id: number, layers?: number[], taxonomyTheme?: number[]): WmFeature<Point> =>
  ({
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [11.0, 46.0]},
    properties: {
      id,
      ...(layers !== undefined && {layers}),
      ...(taxonomyTheme !== undefined && {
        taxonomy: {theme: taxonomyTheme},
      }),
      taxonomyIdentifiers: [],
    },
  } as any);

const makeLayer = (id: string | number, taxonomyThemes: any[] = []) => ({
  id: String(id),
  taxonomy_themes: taxonomyThemes,
});

describe('hasLayerIdData', () => {
  it('returns false for empty array', () => {
    expect(hasLayerIdData([])).toBeFalse();
  });

  it('returns false when no POI has properties.layers', () => {
    const pois = [makePoi(1), makePoi(2)];
    expect(hasLayerIdData(pois)).toBeFalse();
  });

  it('returns false when all POIs have empty layers array', () => {
    const pois = [makePoi(1, []), makePoi(2, [])];
    expect(hasLayerIdData(pois)).toBeFalse();
  });

  it('returns true when at least one POI has a non-empty layers array', () => {
    const pois = [makePoi(1), makePoi(2, [24])];
    expect(hasLayerIdData(pois)).toBeTrue();
  });

  it('returns true when all POIs have layers', () => {
    const pois = [makePoi(1, [24]), makePoi(2, [47, 63])];
    expect(hasLayerIdData(pois)).toBeTrue();
  });
});

describe('filterFeaturesByLayerId', () => {
  const pois = [
    makePoi(1, [24]),
    makePoi(2, [47, 63]),
    makePoi(3, [24, 47]),
    makePoi(4, [99]),
  ];

  it('returns only POIs that include the given layer ID', () => {
    const result = filterFeaturesByLayerId(pois, 24);
    expect(result.length).toBe(2);
    expect(result.map(p => p.properties.id)).toEqual([1, 3]);
  });

  it('returns POI associated to multiple layers in each respective filter', () => {
    const result47 = filterFeaturesByLayerId(pois, 47);
    expect(result47.map(p => p.properties.id)).toContain(2);
    expect(result47.map(p => p.properties.id)).toContain(3);

    const result63 = filterFeaturesByLayerId(pois, 63);
    expect(result63.map(p => p.properties.id)).toContain(2);
  });

  it('returns empty array when no POI matches the layer ID', () => {
    const result = filterFeaturesByLayerId(pois, 999);
    expect(result.length).toBe(0);
  });

  it('returns all features and warns when layerId is NaN', () => {
    spyOn(console, 'warn');
    const result = filterFeaturesByLayerId(pois, NaN);
    expect(result).toEqual(pois);
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns empty array for layerId 0 (not NaN, just no match)', () => {
    const result = filterFeaturesByLayerId(pois, 0);
    expect(result.length).toBe(0);
  });
});

describe('calculateLayerFeaturesCount — NaN fallback (non-numeric layer.id)', () => {
  const pois = [
    makePoi(1, [24], [10]),
    makePoi(2, [47], [20]),
  ] as WmFeature<Point>[];

  it('falls back to taxonomy when layer.id is empty string (produces numericId=0)', () => {
    spyOn(console, 'warn');
    const layer = {id: '', taxonomy_themes: [{id: 10}]};
    const result = calculateLayerFeaturesCount([layer] as any, pois, []);
    expect(console.warn).toHaveBeenCalled();
    expect(result[''].pois).toBe(1); // POI 1 has taxonomy theme 10
  });
});

describe('calculateLayerFeaturesCount — new server (properties.layers available)', () => {
  const pois = [
    makePoi(1, [24]),
    makePoi(2, [24, 47]),
    makePoi(3, [47]),
    makePoi(4, [99]),
  ] as WmFeature<Point>[];

  const layers = [makeLayer(24), makeLayer(47), makeLayer(99)];

  it('counts POIs per layer using properties.layers', () => {
    const result = calculateLayerFeaturesCount(layers as any, pois, []);
    expect(result['24'].pois).toBe(2); // POI 1 and 2
    expect(result['47'].pois).toBe(2); // POI 2 and 3
    expect(result['99'].pois).toBe(1); // POI 4
  });

  it('counts 0 for a layer with no associated POIs', () => {
    const result = calculateLayerFeaturesCount([makeLayer(55)] as any, pois, []);
    expect(result['55'].pois).toBe(0);
  });

  it('includes track count from aggregation buckets', () => {
    const buckets = [{key: 24, doc_count: 10}, {key: 47, doc_count: 5}];
    const result = calculateLayerFeaturesCount(layers as any, pois, buckets as any);
    expect(result['24'].tracks).toBe(10);
    expect(result['47'].tracks).toBe(5);
    expect(result['99'].tracks).toBe(0);
  });
});

describe('calculateLayerFeaturesCount — legacy server (no properties.layers, fallback taxonomy)', () => {
  const pois = [
    makePoi(1, undefined, [10, 20]),
    makePoi(2, undefined, [20]),
    makePoi(3, undefined, [30]),
  ] as WmFeature<Point>[];

  const layers = [
    makeLayer(1, [{id: 10}, {id: 20}]),
    makeLayer(2, [{id: 30}]),
    makeLayer(3, [{id: 99}]),
  ];

  it('falls back to taxonomy theme count when no POI has properties.layers', () => {
    const result = calculateLayerFeaturesCount(layers as any, pois, []);
    expect(result['1'].pois).toBe(2); // POI 1 (has 10 and 20) and POI 2 (has 20)
    expect(result['2'].pois).toBe(1); // POI 3 (has 30)
    expect(result['3'].pois).toBe(0); // no POI with taxonomy 99
  });
});
