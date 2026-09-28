import {WmAddressComponent} from './address.component';
import {buildMapsHref} from './maps-href';

/**
 * Il link di Google Maps si costruisce da `address`, non dal vecchio `address_link`: quel campo
 * univa con `+` per pre-codificare gli spazi, ma `encodeURIComponent` li trasformava in `%2B`,
 * cioè in un più letterale dentro l'indirizzo. Le due codifiche si annullavano, e chi toccava il
 * link finiva su una ricerca sbagliata (oc:8406).
 */
describe('WmAddressComponent.mapsHref (oc:8406)', () => {
  const href = (address: string) => {
    const cmp = new WmAddressComponent();
    cmp.address = address;
    return cmp.mapsHref;
  };

  it('codifica gli spazi come %20, non come +', () => {
    const url = href('Via Roma 1, Pisa');

    expect(url).toContain('daddr=Via%20Roma%201%2C%20Pisa');
    expect(url).withContext('un + qui sarebbe un più letterale, non uno spazio').not.toContain('%2B');
  });

  it('conserva gli accenti codificandoli', () => {
    expect(href('Piazza Città 3')).toContain('Citt%C3%A0');
  });

  it('regge un indirizzo vuoto senza rompere l’URL', () => {
    expect(href('')).toBe('https://www.google.com/maps?daddr=&navigate=yes');
  });
});

/**
 * La stessa funzione la usa anche `wm-webapp` nel ramo UGC del popup, dove prima la template
 * string era copiata a mano e senza spec (oc:8613).
 */
describe('buildMapsHref (oc:8613)', () => {
  it('è la stessa cosa che rende il componente', () => {
    const cmp = new WmAddressComponent();
    cmp.address = 'Via Roma 1, Pisa';

    expect(buildMapsHref('Via Roma 1, Pisa')).toBe(cmp.mapsHref);
  });

  it('regge null e undefined come una stringa vuota', () => {
    const vuoto = 'https://www.google.com/maps?daddr=&navigate=yes';

    expect(buildMapsHref(null)).toBe(vuoto);
    expect(buildMapsHref(undefined)).toBe(vuoto);
  });
});
