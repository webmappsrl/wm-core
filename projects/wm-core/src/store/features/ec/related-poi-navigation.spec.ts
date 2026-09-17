import {Point} from 'geojson';
import {WmFeature} from '@wm-types/feature';

import {nextRelatedPoiId, prevRelatedPoiId} from './ec.selector';

/**
 * I due selettori si testano con la loro `projector`, senza montare lo store: sono funzioni pure
 * di (elenco dei correlati, id del correlato corrente).
 */
const poi = (id: number): WmFeature<Point> =>
  ({type: 'Feature', geometry: {type: 'Point', coordinates: [0, 0]}, properties: {id}} as any);

describe('nextRelatedPoiId / prevRelatedPoiId (oc:8406)', () => {
  const elenco = [poi(10), poi(20), poi(30)];

  it('scorre avanti e indietro quando un correlato è selezionato', () => {
    expect(nextRelatedPoiId.projector(elenco, 20)).toBe(30);
    expect(prevRelatedPoiId.projector(elenco, 20)).toBe(10);
  });

  it('agli estremi non gira in tondo', () => {
    expect(nextRelatedPoiId.projector(elenco, 30)).toBeNull();
    expect(prevRelatedPoiId.projector(elenco, 10)).toBeNull();
  });

  it('senza un track con correlati non lancia', () => {
    expect(nextRelatedPoiId.projector(null, 20)).toBeNull();
    expect(prevRelatedPoiId.projector(null, 20)).toBeNull();
  });

  // Il difetto che queste righe bloccano: con nessun correlato selezionato `findIndex` torna -1, e
  // `elenco[-1 + 1]` sarebbe il primo POI dell'elenco. Le frecce del popup della webapp saltavano
  // quindi su un POI che non c'entrava con quello aperto.
  it('senza un correlato selezionato non propone nessun POI', () => {
    for (const idNonPresente of [null, undefined, 999]) {
      expect(nextRelatedPoiId.projector(elenco, idNonPresente as any))
        .withContext(`next con id ${idNonPresente}`)
        .toBeNull();
      expect(prevRelatedPoiId.projector(elenco, idNonPresente as any))
        .withContext(`prev con id ${idNonPresente}`)
        .toBeNull();
    }
  });
});
