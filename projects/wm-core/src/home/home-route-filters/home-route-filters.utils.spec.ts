import {bucketLabel, bucketMatches} from './home-route-filters.utils';
import {NumericBucket} from '@wm-types/config';

describe('bucketMatches', () => {
  const buckets: NumericBucket[] = [
    {id: '0-5', min: 0, max: 5, unitKey: 'tappe'},
    {id: '5-10', min: 5, max: 10, unitKey: 'tappe'},
    {id: '10-20', min: 10, max: 20, unitKey: 'tappe'},
    {id: '20+', min: 20, max: null, unitKey: 'tappe'},
  ];

  it('include il valore minimo assoluto nel primo bucket (limite inferiore inclusivo solo lì)', () => {
    expect(bucketMatches(0, buckets[0], true)).toBe(true);
  });

  it('assegna un valore esattamente al confine condiviso al bucket SUPERIORE, non a quello inferiore', () => {
    expect(bucketMatches(5, buckets[0], true)).toBe(false);
    expect(bucketMatches(5, buckets[1], false)).toBe(true);
  });

  it('assegna il limite superiore condiviso al bucket successivo, non a quello corrente (mutua esclusione)', () => {
    expect(bucketMatches(10, buckets[1], false)).toBe(false);
    expect(bucketMatches(10, buckets[2], false)).toBe(true);
  });

  it('gestisce il bucket aperto (max null) senza limite superiore', () => {
    expect(bucketMatches(999, buckets[3], false)).toBe(true);
  });

  it('esclude un valore sotto il minimo del bucket', () => {
    expect(bucketMatches(4, buckets[1], false)).toBe(false);
  });
});

import {
  fixedListValueOptions,
  fixedSingleValueOptions,
  layerMatchesFilters,
  listValueOptions,
  localizedLabel,
  numericBucketOptions,
  singleValueOptions,
} from './home-route-filters.utils';
import {STAGE_COUNT_BUCKETS} from '@wm-core/constants/route-filters';
import {ILAYER} from '@wm-core/types/config';

describe('localizedLabel', () => {
  it('usa la lingua attiva quando disponibile', () => {
    expect(localizedLabel({it: 'Anello', en: 'Roundtrip'}, 'it')).toBe('Anello');
  });

  it('ricade su it se la lingua attiva manca', () => {
    expect(localizedLabel({it: 'Anello', en: 'Roundtrip'}, 'fr' as any)).toBe('Anello');
  });

  it('ricade sulla prima traduzione disponibile se manca anche it/en', () => {
    expect(localizedLabel({de: 'Rundweg'}, 'fr' as any)).toBe('Rundweg');
  });

  it('ritorna stringa vuota se non c\'è alcuna traduzione', () => {
    expect(localizedLabel(undefined, 'it')).toBe('');
    expect(localizedLabel({}, 'it')).toBe('');
  });
});

function makeLayer(id: string, attributes: ILAYER['attributes']): ILAYER {
  return {id, attributes} as ILAYER;
}

describe('singleValueOptions', () => {
  it('deduplica i valori e conta le occorrenze, ordinando per etichetta (non per value)', () => {
    // 'discontinuous'/'roundtrip' sono gli unici valori RouteShape validi (vedi wm-types ROUTE_SHAPES)
    // che invertono l'ordine tra value e label: per value 'discontinuous' < 'roundtrip', ma per
    // label 'Anello' < 'Discontinuo' — dimostra che l'ordine segue la label, non il value.
    const layers = [
      makeLayer('1', {shape: {value: 'discontinuous', name: {it: 'Discontinuo'}}}),
      makeLayer('2', {shape: {value: 'discontinuous', name: {it: 'Discontinuo'}}}),
      makeLayer('3', {shape: {value: 'roundtrip', name: {it: 'Anello'}}}),
    ];
    const options = singleValueOptions(layers, 'shape', 'it');
    expect(options).toEqual([
      {value: 'roundtrip', label: 'Anello', count: 1},
      {value: 'discontinuous', label: 'Discontinuo', count: 2},
    ]);
  });

  it('esclude i valori passati in `exclude` (es. discontinuous)', () => {
    const layers = [
      makeLayer('1', {shape: {value: 'discontinuous', name: {it: 'Discontinuo'}}}),
      makeLayer('2', {shape: {value: 'linear', name: {it: 'Lineare'}}}),
    ];
    const options = singleValueOptions(layers, 'shape', 'it', ['discontinuous']);
    expect(options).toEqual([{value: 'linear', label: 'Lineare', count: 1}]);
  });

  it('ignora i layer senza attributes o senza il campo richiesto', () => {
    const layers = [makeLayer('1', undefined), makeLayer('2', {})];
    expect(singleValueOptions(layers, 'shape', 'it')).toEqual([]);
  });
});

describe('listValueOptions', () => {
  it('un cammino multi-regione contribuisce al count di ogni regione attraversata', () => {
    const layers = [
      makeLayer('1', {
        taxonomy_where: [
          {value: 'tuscany', name: {it: 'Toscana'}},
          {value: 'umbria', name: {it: 'Umbria'}},
        ],
      }),
      makeLayer('2', {taxonomy_where: [{value: 'tuscany', name: {it: 'Toscana'}}]}),
    ];
    const options = listValueOptions(layers, 'taxonomy_where', 'it');
    expect(options).toEqual([
      {value: 'tuscany', label: 'Toscana', count: 2},
      {value: 'umbria', label: 'Umbria', count: 1},
    ]);
  });
});

describe('fixedSingleValueOptions', () => {
  it('include sempre tutti i valori dell\'enum, anche a count 0, nell\'ordine dato', () => {
    const layers = [makeLayer('1', {walking_network: {value: 'nwn', name: {it: 'Nazionale'}}})];
    const options = fixedSingleValueOptions(
      layers,
      'walking_network',
      ['lwn', 'rwn', 'nwn', 'iwn'] as const,
      value => `label-${value}`,
    );
    expect(options).toEqual([
      {value: 'lwn', label: 'label-lwn', count: 0},
      {value: 'rwn', label: 'label-rwn', count: 0},
      {value: 'nwn', label: 'label-nwn', count: 1},
      {value: 'iwn', label: 'label-iwn', count: 0},
    ]);
  });
});

describe('fixedListValueOptions', () => {
  it('include sempre tutti i valori dell\'enum, anche a count 0, nell\'ordine dato', () => {
    const layers = [
      makeLayer('1', {season: [{value: 'autumn', name: {it: 'Autunno'}}]}),
      makeLayer('2', {season: [{value: 'autumn', name: {it: 'Autunno'}}, {value: 'winter', name: {it: 'Inverno'}}]}),
    ];
    const options = fixedListValueOptions(
      layers,
      'season',
      ['spring', 'summer', 'autumn', 'winter'] as const,
      value => `label-${value}`,
    );
    expect(options).toEqual([
      {value: 'spring', label: 'label-spring', count: 0},
      {value: 'summer', label: 'label-summer', count: 0},
      {value: 'autumn', label: 'label-autumn', count: 2},
      {value: 'winter', label: 'label-winter', count: 1},
    ]);
  });
});

describe('numericBucketOptions', () => {
  it('conta i layer per bucket, un cammino con 5 tappe esatte va nel bucket "5-10"', () => {
    const layers = [
      makeLayer('1', {stage_count: 3}),
      makeLayer('2', {stage_count: 5}),
      makeLayer('3', {stage_count: 30}),
    ];
    const options = numericBucketOptions(layers, 'stage_count', STAGE_COUNT_BUCKETS, 'tappe');
    expect(options).toEqual([
      {value: '0-5', label: '0-5 tappe', count: 1},
      {value: '5-10', label: '5-10 tappe', count: 1},
      {value: '10-20', label: '10-20 tappe', count: 0},
      {value: '20+', label: '>20 tappe', count: 1},
    ]);
  });
});

describe('bucketLabel', () => {
  it('include sempre l\'unità di misura, con ">" per il bucket aperto (max null)', () => {
    expect(bucketLabel({id: '5-10', min: 5, max: 10, unitKey: 'tappe'}, 'tappe')).toBe('5-10 tappe');
    expect(bucketLabel({id: '20+', min: 20, max: null, unitKey: 'tappe'}, 'tappe')).toBe('>20 tappe');
  });
});

describe('layerMatchesFilters', () => {
  it('nessun filtro attivo = tutti i cammini passano', () => {
    expect(layerMatchesFilters(makeLayer('1', {}), {})).toBe(true);
  });

  it('AND tra dropdown diversi', () => {
    const layer = makeLayer('1', {
      shape: {value: 'roundtrip', name: {}},
      taxonomy_where: [{value: 'tuscany', name: {}}],
    });
    expect(layerMatchesFilters(layer, {shape: ['roundtrip'], regions: ['tuscany']})).toBe(true);
    expect(layerMatchesFilters(layer, {shape: ['linear'], regions: ['tuscany']})).toBe(false);
  });

  it('OR dentro lo stesso dropdown', () => {
    const layer = makeLayer('1', {taxonomy_where: [{value: 'tuscany', name: {}}]});
    expect(layerMatchesFilters(layer, {regions: ['tuscany', 'umbria']})).toBe(true);
  });

  it('attributo assente esclude il layer solo se il filtro è attivo', () => {
    const layer = makeLayer('1', {});
    expect(layerMatchesFilters(layer, {regions: ['tuscany']})).toBe(false);
    expect(layerMatchesFilters(layer, {})).toBe(true);
  });

  it('bucket numerico: un valore esattamente al confine cade nel bucket superiore selezionato', () => {
    const layer = makeLayer('1', {stage_count: 5});
    expect(layerMatchesFilters(layer, {stageCount: ['0-5']})).toBe(false);
    expect(layerMatchesFilters(layer, {stageCount: ['5-10']})).toBe(true);
  });
});
