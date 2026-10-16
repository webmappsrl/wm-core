import {Pipe, PipeTransform} from '@angular/core';

/**
 * Supporto ai test delle pagine del passaporto (oc:8702): una pipe `wmtrans` finta e un
 * `LangService` finto che si comportano allo stesso modo, così gli spec confrontano i testi
 * italiani senza caricare le traduzioni vere.
 */

/** Traduzioni finte delle chiavi non italiane usate dai template del passaporto. */
export const FAKE_TRANSLATIONS: Record<string, string> = {
  ascent: 'Dislivello positivo',
  descent: 'Dislivello negativo',
};

/**
 * Traduce come la pipe finta: le chiavi di `FAKE_TRANSLATIONS` diventano il testo finto, le altre
 * restano la chiave italiana; poi sostituisce i parametri `{{nome}}`.
 *
 * @param key Chiave da tradurre.
 * @param params Parametri da interpolare.
 * @returns Il testo interpolato.
 */
export function fakeTranslate(key: unknown, params?: Record<string, unknown>): string {
  const text = FAKE_TRANSLATIONS[`${key}`] ?? `${key ?? ''}`;
  return Object.entries(params ?? {}).reduce(
    (acc, [k, v]) => acc.replace(`{{${k}}}`, `${v}`),
    text,
  );
}

/** Pipe `wmtrans` finta, da dichiarare nel `TestBed` al posto di quella vera. */
@Pipe({standalone: false, name: 'wmtrans'})
export class FakeTransPipe implements PipeTransform {
  /**
   * @param value Chiave.
   * @param params Parametri da interpolare.
   * @returns Il testo tradotto in modo finto e interpolato.
   */
  transform(value: unknown, params?: Record<string, unknown>): string {
    return fakeTranslate(value, params);
  }
}

/** `LangService` finto: lingua corrente `it`, `instant()` traduce come `FakeTransPipe`. */
export interface FakeLangService {
  currentLang: string;
  instant: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Crea il `LangService` finto, da fornire con `{provide: LangService, useValue: fakeLangService()}`.
 *
 * @returns Il servizio finto.
 */
export function fakeLangService(): FakeLangService {
  return {currentLang: 'it', instant: (key, params) => fakeTranslate(key, params)};
}
