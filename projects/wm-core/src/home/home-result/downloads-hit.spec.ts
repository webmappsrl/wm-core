import {downloadedPropertiesToHit} from './downloads-hit';
import v1Fixture from '../../utils/fixtures/aws-version-adapter/forestasdev-769-v1.json';

describe('downloadedPropertiesToHit', () => {
  it('ricostruisce taxonomyWheres da taxonomies.where, ordinato per admin_level', () => {
    const hit: any = downloadedPropertiesToHit((v1Fixture as any).properties);
    expect(hit.taxonomyWheres.length).toBe(3);
    expect(hit.taxonomyWheres[hit.taxonomyWheres.length - 1]).toEqual({en: 'Fonni'});
  });

  it('esclude gli elementi senza admin_level', () => {
    const hit: any = downloadedPropertiesToHit({
      taxonomies: {where: [{identifier: 'a', name: {it: 'A'}}, {identifier: 'b', name: {it: 'B'}, admin_level: 6}, {identifier: 'c', name: {it: 'C'}, admin_level: 4}]},
    });
    expect(hit.taxonomyWheres).toEqual([{it: 'C'}, {it: 'B'}]);
  });

  it('senza where produce un array vuoto', () => {
    expect((downloadedPropertiesToHit({taxonomies: {}}) as any).taxonomyWheres).toEqual([]);
  });

  it('un taxonomyWheres già presente resta invariato', () => {
    const existing = [{it: 'Roma'}];
    const hit: any = downloadedPropertiesToHit({taxonomyWheres: existing, taxonomies: {where: [{identifier: 'x', name: {it: 'Y'}, admin_level: 4}]}});
    expect(hit.taxonomyWheres).toBe(existing);
  });
});
