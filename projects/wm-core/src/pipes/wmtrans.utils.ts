import {LangService} from '../localization/lang.service';

/** Ciò che serve della `LangService` per tradurre un valore. */
export type WmTranslator = Pick<LangService, 'currentLang' | 'defaultLang' | 'instant'>;

/**
 * Traduzione di un valore come la fa la pipe `wmtrans` (oc:8703, estratta per riusarla nel
 * codice): un oggetto per lingua dà la lingua corrente, poi quella di default, poi il primo valore
 * non vuoto; un testo o un numero passa da `instant` con i parametri.
 *
 * @param value Valore da tradurre: chiave, numero o oggetto per lingua.
 * @param lang Servizio delle lingue.
 * @param args Parametri da interpolare, passati a `instant`.
 * @returns Il testo tradotto, vuoto se il valore è vuoto.
 */
export function wmTranslate(value: any, lang: WmTranslator, ...args: unknown[]): string {
  const currentLang = lang.currentLang;
  const defaultLang = lang.defaultLang;

  if (value) {
    if (currentLang && value[currentLang]) return value[currentLang];
    if (defaultLang && value[defaultLang]) return value[defaultLang];

    if (typeof value === 'string' || typeof value === 'number') {
      return (lang.instant as (key: string, ...params: unknown[]) => string)(`${value}`, ...args);
    }

    for (const k in value) if (value[k]) return value[k];
  }
  return '';
}
