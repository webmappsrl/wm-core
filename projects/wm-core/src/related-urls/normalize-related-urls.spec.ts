import {normalizeRelatedUrls} from './related-urls.component';

describe('normalizeRelatedUrls', () => {
  it('preserva lo schema http:// senza forzare https', () => {
    const entries = normalizeRelatedUrls({'Pro Loco': 'http://www.prolococassanodadda.com/'});
    expect(entries).toEqual([{label: 'Pro Loco', url: 'http://www.prolococassanodadda.com/'}]);
  });

  it('accetta una stringa nuda e la usa anche come etichetta', () => {
    expect(normalizeRelatedUrls('http://www.turismosanbenedettopo.it/')).toEqual([
      {
        label: 'http://www.turismosanbenedettopo.it/',
        url: 'http://www.turismosanbenedettopo.it/',
      },
    ]);
  });

  it('non itera i caratteri di una stringa', () => {
    expect(normalizeRelatedUrls('https://example.org').length).toBe(1);
  });

  it('accetta un array di url', () => {
    expect(normalizeRelatedUrls(['https://a.org', 'http://b.org']).length).toBe(2);
  });

  it('scarta array e oggetti vuoti', () => {
    expect(normalizeRelatedUrls([])).toEqual([]);
    expect(normalizeRelatedUrls({})).toEqual([]);
  });

  it('scarta le voci con etichetta vuota', () => {
    expect(normalizeRelatedUrls({'': 'https://example.org'})).toEqual([]);
  });

  it('scarta le voci con url vuoto', () => {
    expect(normalizeRelatedUrls({Sito: '   '})).toEqual([]);
  });

  it('è vuoto per null, undefined e false', () => {
    expect(normalizeRelatedUrls(null)).toEqual([]);
    expect(normalizeRelatedUrls(undefined)).toEqual([]);
    expect(normalizeRelatedUrls(false)).toEqual([]);
  });

  it('conserva più voci di un oggetto', () => {
    const entries = normalizeRelatedUrls({
      'Comune di Pizzighettone': 'https://www.comune.pizzighettone.cr.it/it',
      'Pizzighettone (da Wikipedia)': 'https://it.wikipedia.org/wiki/Pizzighettone',
    });
    expect(entries.length).toBe(2);
  });
});

/**
 * Un valore senza schema in un `href` è un percorso relativo, non un link esterno: la webapp
 * aprirebbe `https://<host>/…/www.prolocox.it`. Misurato sui POI delle app 75, 29 e 33: 235 URL
 * su 1147 non hanno schema, il 20,5% (oc:8406, trovato in review).
 */
describe('normalizeRelatedUrls: lo schema (oc:8613)', () => {
  it('aggiunge https:// a un valore che non ha schema', () => {
    expect(normalizeRelatedUrls('www.prolocox.it')[0].url).toBe('https://www.prolocox.it');
    expect(normalizeRelatedUrls(['www.a.it'])[0].url).toBe('https://www.a.it');
    expect(normalizeRelatedUrls({'Pro Loco': 'www.a.it'})[0].url).toBe('https://www.a.it');
  });

  it('lascia http:// com è: il motivo per cui non si forza TLS vale ancora', () => {
    expect(normalizeRelatedUrls('http://www.comune.it')[0].url).toBe('http://www.comune.it');
  });

  it('non tocca gli schemi già presenti, compresi quelli non http', () => {
    expect(normalizeRelatedUrls('https://a.it')[0].url).toBe('https://a.it');
    expect(normalizeRelatedUrls('mailto:a@b.it')[0].url).toBe('mailto:a@b.it');
    expect(normalizeRelatedUrls('tel:+390123')[0].url).toBe('tel:+390123');
  });

  it('ripara lo schema a cui mancano i due punti, invece di prefissarlo di nuovo', () => {
    // valore reale, app 29
    expect(normalizeRelatedUrls('https//www.campingilpoggetto.com/')[0].url).toBe(
      'https://www.campingilpoggetto.com/',
    );
  });

  it('l etichetta mostrata resta il valore arrivato, non quello corretto', () => {
    const [entry] = normalizeRelatedUrls('www.prolocox.it');

    expect(entry.label).toBe('www.prolocox.it');
    expect(entry.url).toBe('https://www.prolocox.it');
  });
});
