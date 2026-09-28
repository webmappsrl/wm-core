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

  it('non tocca gli schemi ammessi', () => {
    expect(normalizeRelatedUrls('https://a.it')[0].url).toBe('https://a.it');
    expect(normalizeRelatedUrls('mailto:a@b.it')[0].url).toBe('mailto:a@b.it');
    expect(normalizeRelatedUrls('tel:+390123')[0].url).toBe('tel:+390123');
  });

  // `[href]` su `<ion-item>` è un input di componente, non un attributo del DOM: Angular non lo
  // sanitizza e Ionic lo rende tale e quale in un `<a href>`. Un `related_url` salvato con
  // `javascript:` eseguirebbe nell'origine dell'app, dove sta il token (oc:8613).
  it('scarta gli schemi che possono eseguire codice', () => {
    expect(normalizeRelatedUrls('javascript:alert(document.cookie)')).toEqual([]);
    expect(normalizeRelatedUrls('JavaScript:alert(1)'))
      .withContext('il confronto non deve dipendere dalle maiuscole')
      .toEqual([]);
    expect(normalizeRelatedUrls('data:text/html,<script>x</script>')).toEqual([]);
    expect(normalizeRelatedUrls('vbscript:msgbox')).toEqual([]);
  });

  it('scarta lo schema pericoloso anche dentro un array o un oggetto', () => {
    expect(normalizeRelatedUrls(['javascript:alert(1)', 'www.buono.it'])).toEqual([
      {label: 'www.buono.it', url: 'https://www.buono.it'},
    ]);
    expect(normalizeRelatedUrls({Cattivo: 'javascript:alert(1)', Buono: 'https://a.it'})).toEqual([
      {label: 'Buono', url: 'https://a.it'},
    ]);
  });

  // `www.sito.it:8080` e `localhost:3000` hanno la forma di uno schema ma sono host con la porta:
  // prima di oc:8406 funzionavano, e scartarli o lasciarli relativi sarebbe un difetto.
  it('riconosce un host con la porta e non lo scambia per uno schema', () => {
    expect(normalizeRelatedUrls('www.sito.it:8080/x')[0].url).toBe('https://www.sito.it:8080/x');
    expect(normalizeRelatedUrls('localhost:3000')[0].url).toBe('https://localhost:3000');
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
