import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {adaptTrackToCurrentVersion} from './aws-version-adapter';
import v1Fixture from './fixtures/aws-version-adapter/forestasdev-769-v1.json';
import unversionedFixture from './fixtures/aws-version-adapter/forestasdev-769-unversioned.json';
import geohubFixture from './fixtures/aws-version-adapter/geohub-100-unversioned.json';
import maphubFixture from './fixtures/aws-version-adapter/maphub-2-unversioned.json';
import camminiditaliaFixture from './fixtures/aws-version-adapter/camminiditalia-2-unversioned.json';

const asTrack = (json: unknown): WmFeature<LineString> => json as WmFeature<LineString>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('adaptTrackToCurrentVersion', () => {
  it('una traccia v1 esce invariata e senza icone', () => {
    const input = asTrack(v1Fixture);
    const result = adaptTrackToCurrentVersion(input, 'v1')!;
    expect(result.track).toBe(input);
    expect(result.icons).toEqual({});
  });

  it('una traccia di shard senza versione tiene taxonomies e perde le chiavi vecchie', () => {
    const result = adaptTrackToCurrentVersion(asTrack(unversionedFixture), undefined)!;
    const props: any = result.track.properties;
    expect(props.taxonomies).toEqual((v1Fixture as any).properties.taxonomies);
    expect(props.taxonomy).toBeUndefined();
    expect(props.taxonomy_where).toBeUndefined();
    expect(props.taxonomyWheres).toBeUndefined();
  });

  it('una traccia GeoHub costruisce activity e nessun where', () => {
    const props: any = adaptTrackToCurrentVersion(asTrack(geohubFixture), undefined)!.track.properties;
    expect(props.taxonomies.activity).toEqual([
      {identifier: 'hiking', name: {it: 'Escursionismo', en: 'Hiking'}, icon_name: 'txn-hiking'},
    ]);
    expect(props.taxonomies.where).toBeUndefined();
    expect(props.taxonomy).toBeUndefined();
    expect(props.taxonomy_where).toBeUndefined();
    expect(props.taxonomyWheres).toBeUndefined();
  });

  it('gli SVG inline di GeoHub diventano icone', () => {
    const {icons} = adaptTrackToCurrentVersion(asTrack(geohubFixture), undefined)!;
    expect(Object.keys(icons)).toEqual(['txn-hiking']);
    expect(icons['txn-hiking']).toBe((geohubFixture as any).properties.taxonomy.activity[0].icon);
  });

  it('un elemento senza icon_name con SVG usa txn-<identifier>', () => {
    const input: any = clone(geohubFixture);
    delete input.properties.taxonomy.activity[0].icon_name;
    const {track, icons} = adaptTrackToCurrentVersion(asTrack(input), undefined)!;
    expect(Object.keys(icons)).toEqual(['txn-hiking']);
    expect((track.properties as any).taxonomies.activity[0].icon_name).toBe('txn-hiking');
  });

  it('un elemento con icon_name null resta valido', () => {
    const input: any = clone(geohubFixture);
    input.properties.taxonomy.activity[0].icon_name = null;
    delete input.properties.taxonomy.activity[0].icon;
    const {track, icons} = adaptTrackToCurrentVersion(asTrack(input), undefined)!;
    expect(icons).toEqual({});
    // icon_name null presente in input resta null (il tipo lo ammette)
    expect((track.properties as any).taxonomies.activity[0]).toEqual({
      identifier: 'hiking',
      name: {it: 'Escursionismo', en: 'Hiking'},
      icon_name: null,
    });
  });

  it('elementi di activity non oggetto vengono ignorati', () => {
    const input: any = clone(geohubFixture);
    input.properties.taxonomy.activity = [null, 5, input.properties.taxonomy.activity[0]];
    const {track} = adaptTrackToCurrentVersion(asTrack(input), undefined)!;
    const activity = (track.properties as any).taxonomies.activity;
    expect(activity.length).toBe(1);
    expect(activity[0].identifier).toBe('hiking');
  });

  it('una traccia senza tassonomie produce taxonomies vuota', () => {
    const minimal = {
      type: 'Feature',
      geometry: {type: 'LineString', coordinates: []},
      properties: {id: 1},
    };
    const result = adaptTrackToCurrentVersion(asTrack(minimal), undefined)!;
    expect((result.track.properties as any).taxonomies).toEqual({});
  });

  it('i related_pois restano come arrivano', () => {
    const cases = [
      [v1Fixture, 'v1'],
      [unversionedFixture, undefined],
    ] as const;
    for (const [fixture, version] of cases) {
      const result = adaptTrackToCurrentVersion(asTrack(fixture), version as any)!;
      expect((result.track.properties as any).related_pois[0].properties.taxonomy).toBeDefined();
    }
  });

  it('è idempotente', () => {
    const first = adaptTrackToCurrentVersion(asTrack(geohubFixture), undefined)!;
    const second = adaptTrackToCurrentVersion(first.track, undefined)!;
    expect(second.track).toEqual(first.track);
    expect(second.icons).toEqual({});
  });

  it("non muta l'input", () => {
    const before = JSON.stringify(geohubFixture);
    adaptTrackToCurrentVersion(asTrack(geohubFixture), undefined);
    expect(JSON.stringify(geohubFixture)).toBe(before);
  });

  it('null resta null', () => {
    expect(adaptTrackToCurrentVersion(null, undefined)).toBeNull();
  });

  it('taxonomies è per tipo: where esistente resta, activity si costruisce', () => {
    const input: any = clone(geohubFixture);
    const where = [{identifier: 'w1', name: {it: 'Sardegna'}, admin_level: 4}];
    input.properties.taxonomies = {where};
    const props: any = adaptTrackToCurrentVersion(asTrack(input), undefined)!.track.properties;
    expect(props.taxonomies.where).toEqual(where);
    expect(props.taxonomies.activity).toEqual([
      {identifier: 'hiking', name: {it: 'Escursionismo', en: 'Hiking'}, icon_name: 'txn-hiking'},
    ]);
  });

  it('gli elementi di activity senza identifier vengono saltati, icona compresa', () => {
    const input: any = clone(geohubFixture);
    input.properties.taxonomy.activity.push({name: {it: 'X'}, icon: '<svg/>'});
    input.properties.taxonomy.activity.push({identifier: null, name: {it: 'Y'}, icon: '<svg/>'});
    const {track, icons} = adaptTrackToCurrentVersion(asTrack(input), undefined)!;
    expect((track.properties as any).taxonomies.activity.length).toBe(1);
    expect(Object.keys(icons)).toEqual(['txn-hiking']);
  });

  it('una traccia maphub senza taxonomies costruisce where da taxonomy_where', () => {
    const props: any = adaptTrackToCurrentVersion(asTrack(maphubFixture), undefined)!.track.properties;
    expect(props.taxonomies.where).toEqual([
      {
        identifier: 'R42611',
        name: {de: 'Emilia-Romagna', en: 'Emilia-Romagna', es: 'Emilia-Romaña', fr: 'Émilie-Romagne', it: 'Emilia-Romagna'},
        admin_level: 4,
      },
      {identifier: 'R43003', name: {en: 'Lama Mocogno', it: 'Lama Mocogno'}, admin_level: 8},
    ]);
    expect(props.taxonomies.activity).toEqual([
      {identifier: 'mountain-bike', name: {it: 'Mountain Bike', en: 'Mountain Bike'}, icon_name: 'txn-mtb'},
    ]);
    expect(props.taxonomy).toBeUndefined();
    expect(props.taxonomy_where).toBeUndefined();
    expect(props.taxonomyWheres).toBeUndefined();
  });

  it('where da taxonomy_where toglie le chiavi interne come _source', () => {
    const props: any = adaptTrackToCurrentVersion(asTrack(camminiditaliaFixture), undefined)!.track
      .properties;
    expect(props.taxonomies.where).toEqual([
      {
        identifier: 'R40784',
        name: {de: 'Latium', en: 'Lazio', es: 'Lacio', fr: 'Latium', it: 'Lazio'},
        admin_level: 4,
      },
    ]);
    expect(props.taxonomies.activity).toBeUndefined();
  });

  it('taxonomies.where esistente vince su taxonomy_where', () => {
    const input: any = clone(maphubFixture);
    const where = [{identifier: 'w1', name: {it: 'Sardegna'}, admin_level: 4}];
    input.properties.taxonomies = {where};
    const props: any = adaptTrackToCurrentVersion(asTrack(input), undefined)!.track.properties;
    expect(props.taxonomies.where).toEqual(where);
  });

  it('una voce di taxonomy_where senza _admin_level non ha admin_level, quelle non oggetto si saltano', () => {
    const input: any = clone(maphubFixture);
    input.properties.taxonomy_where = {R1: {it: 'Senza livello'}, R2: null, R3: 'x'};
    const props: any = adaptTrackToCurrentVersion(asTrack(input), undefined)!.track.properties;
    expect(props.taxonomies.where).toEqual([{identifier: 'R1', name: {it: 'Senza livello'}}]);
  });

  it('where costruito da taxonomy_where è idempotente', () => {
    const once = adaptTrackToCurrentVersion(asTrack(maphubFixture), undefined)!.track;
    const twice = adaptTrackToCurrentVersion(once, undefined)!.track;
    expect(twice.properties).toEqual(once.properties);
  });
});
