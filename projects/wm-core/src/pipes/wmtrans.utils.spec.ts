import {wmTranslate} from './wmtrans.utils';

describe('wmTranslate (oc:8703)', () => {
  const lang = {
    currentLang: 'en',
    defaultLang: 'it',
    instant: (key: string, params?: Record<string, unknown>) =>
      `T(${key})${params ? JSON.stringify(params) : ''}`,
  };

  it('oggetto per lingua: la lingua corrente', () => {
    expect(wmTranslate({it: 'Via degli Dei', en: 'Way of the Gods'}, lang)).toBe('Way of the Gods');
  });

  it('oggetto per lingua senza la corrente: la lingua di default', () => {
    expect(wmTranslate({it: 'Via degli Dei', de: 'Götterweg'}, lang)).toBe('Via degli Dei');
  });

  it('oggetto senza corrente né default: il primo valore non vuoto', () => {
    expect(wmTranslate({fr: '', de: 'Götterweg'}, lang)).toBe('Götterweg');
  });

  it('testo o numero: passa dalla traduzione, con i parametri', () => {
    expect(wmTranslate('Riprova', lang)).toBe('T(Riprova)');
    expect(wmTranslate('{{n}} tappe', lang, {n: 6})).toBe('T({{n}} tappe){"n":6}');
  });

  it('vuoto o assente: stringa vuota', () => {
    expect(wmTranslate(null, lang)).toBe('');
    expect(wmTranslate('', lang)).toBe('');
  });
});
