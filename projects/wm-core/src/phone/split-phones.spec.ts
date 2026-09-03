import {splitPhones, telHref} from './split-phones';

describe('splitPhones (oc:8406)', () => {
  it('splita su virgola e fa trim', () => {
    expect(splitPhones('06 111, 06 222')).toEqual(['06 111', '06 222']);
  });

  it('scarta celle vuote', () => {
    expect(splitPhones('06 111,,06 222')).toEqual(['06 111', '06 222']);
  });

  it('preserva label con spazi e prefisso', () => {
    expect(splitPhones('+39 06 123')).toEqual(['+39 06 123']);
  });

  it('rimuove le etichette generiche del backend e scarta le voci senza numero', () => {
    // Valore reale del POI 97598 (Comune di Lecco) su db_prod
    expect(splitPhones('Fixed Phone:+39 0341 481111,Cell Phone:,Other Phone:')).toEqual([
      '+39 0341 481111',
    ]);
    expect(splitPhones('Fixed Phone:,Cell Phone:328 7208972,Other Phone:')).toEqual([
      '328 7208972',
    ]);
    expect(
      splitPhones('Fixed Phone:+39 0300945924,Cell Phone:+39 3381978721,Other Phone:'),
    ).toEqual(['+39 0300945924', '+39 3381978721']);
    expect(splitPhones('Fixed Phone: +39 0464 670143,Cell Phone:,Other Phone:')).toEqual([
      '+39 0464 670143',
    ]);
  });

  it('conserva le etichette che portano informazione', () => {
    expect(splitPhones('Rifugio: 0123 456789')).toEqual(['Rifugio: 0123 456789']);
  });

  it('non taglia nulla quando il testo prima dei due punti contiene gia\u0300 un numero', () => {
    // Qui il prefisso E\u0300 un numero: tagliarlo perderebbe una linea reale
    expect(splitPhones('0124 442455; Paolo: 347 1932853')).toEqual([
      '0124 442455; Paolo: 347 1932853',
    ]);
    expect(splitPhones('+39 0543 965314  whatsapp: +39 3518901906')).toEqual([
      '+39 0543 965314  whatsapp: +39 3518901906',
    ]);
  });

  it('stringa vuota o null → array vuoto', () => {
    expect(splitPhones('')).toEqual([]);
    expect(splitPhones('   ')).toEqual([]);
    expect(splitPhones(null)).toEqual([]);
    expect(splitPhones(undefined)).toEqual([]);
  });
});

describe('telHref (oc:8406)', () => {
  it('tiene solo cifre e plus', () => {
    expect(telHref('+39 06 123')).toBe('+3906123');
    expect(telHref('06-123.456')).toBe('06123456');
  });
});
