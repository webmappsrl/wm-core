import {hasUsableRelatedUrls} from './poi-properties.component';

describe('hasUsableRelatedUrls', () => {
  it('è false per null e undefined', () => {
    expect(hasUsableRelatedUrls(null)).toBe(false);
    expect(hasUsableRelatedUrls(undefined)).toBe(false);
  });

  it('è false per array vuoto — il caso più frequente nei dati (2.572 POI, 2.796 track)', () => {
    expect(hasUsableRelatedUrls([])).toBe(false);
  });

  it('è false per oggetto vuoto', () => {
    expect(hasUsableRelatedUrls({})).toBe(false);
  });

  it('è false per un oggetto con la sola chiave vuota (100 POI nei dati)', () => {
    expect(hasUsableRelatedUrls({'': 'https://example.org'})).toBe(false);
  });

  it('è false per stringa vuota o di soli spazi', () => {
    expect(hasUsableRelatedUrls('')).toBe(false);
    expect(hasUsableRelatedUrls('   ')).toBe(false);
  });

  it('è true per una stringa URL — 76 POI sull\'app 29', () => {
    expect(hasUsableRelatedUrls('http://www.turismosanbenedettopo.it/')).toBe(true);
  });

  it('è true per un oggetto con etichetta e url validi', () => {
    expect(
      hasUsableRelatedUrls({
        'Comune di Pizzighettone': 'https://www.comune.pizzighettone.cr.it/it',
      }),
    ).toBe(true);
  });

  it('è true per un array con almeno un url', () => {
    expect(hasUsableRelatedUrls(['https://example.org'])).toBe(true);
  });

  it('è false per un booleano — il backend lo rimuove, ma non fidarsi', () => {
    expect(hasUsableRelatedUrls(false)).toBe(false);
  });
});
