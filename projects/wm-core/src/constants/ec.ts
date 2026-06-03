/** Suffisso “non percorribile” per lingua (related POI non accessibile). */
export const EC_NOT_PASSABLE_SUFFIX: Readonly<Record<string, string>> = {
  it: 'non percorribile',
  en: 'impassable',
  de: 'unpassierbar',
  fr: 'non praticable',
  pr: 'impraticável',
  es: 'impracticable',
  sq: 'i papërkalueshëm',
};

/** Etichetta standalone quando manca il nome traccia. */
export const EC_NOT_PASSABLE_ONLY_LABEL: Readonly<Record<string, string>> = {
  it: 'Non percorribile',
  en: 'Impassable',
  de: 'Unpassierbar',
  fr: 'Non praticable',
  pr: 'Impraticável',
  es: 'Impracticable',
  sq: 'I papërkalueshëm',
};
