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
