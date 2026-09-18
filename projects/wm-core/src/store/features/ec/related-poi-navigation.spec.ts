import {Point} from 'geojson';
import {WmFeature} from '@wm-types/feature';

import {
  canNavigateRelatedPois,
  isShowingRelatedPoi,
  nextRelatedPoiId,
  prevRelatedPoiId,
} from './ec.selector';

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

describe('isShowingRelatedPoi / canNavigateRelatedPois (oc:8406)', () => {
  const correlato = {id: 20, name: 'Correlato'};
  const diretto = {id: 77, name: 'Scelto dalla mappa'};

  it('è vero solo se il dettaglio mostra il correlato', () => {
    // `currentPoiProperties` restituisce lo stesso oggetto di uno dei due a monte
    expect(isShowingRelatedPoi.projector(correlato, correlato)).toBeTrue();
    expect(canNavigateRelatedPois.projector(true, 3)).toBeTrue();
  });

  // Il caso del difetto: `ec_related_poi` resta nell'URL dopo aver scelto un POI dalla mappa,
  // quindi il track e il suo conteggio sono ancora in stato, ma il dettaglio mostra un altro POI.
  it('è falso quando si mostra un POI scelto direttamente, anche col track in stato', () => {
    expect(isShowingRelatedPoi.projector(diretto, correlato)).toBeFalse();
    expect(canNavigateRelatedPois.projector(false, 3))
      .withContext('con un POI diretto aperto non si naviga, per quanti correlati abbia il track')
      .toBeFalse();
  });

  it('è falso senza nessun POI aperto', () => {
    expect(isShowingRelatedPoi.projector(null, correlato)).toBeFalse();
    expect(isShowingRelatedPoi.projector(correlato, null)).toBeFalse();
    expect(isShowingRelatedPoi.projector(null, null)).toBeFalse();
  });

  it('un solo correlato non basta a navigare', () => {
    expect(canNavigateRelatedPois.projector(true, 1)).toBeFalse();
    expect(canNavigateRelatedPois.projector(true, 0)).toBeFalse();
  });
});
