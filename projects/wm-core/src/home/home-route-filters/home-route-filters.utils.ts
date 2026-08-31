import {Language} from '@wm-types/language';
import {
  FilterOption,
  LayerAttributeValue,
  NumericBucket,
  RouteFilterState,
} from '@wm-types/config';
import {DISTANCE_BUCKETS, STAGE_COUNT_BUCKETS} from '@wm-core/constants/route-filters';
import {ILAYER} from '@wm-core/types/config';

/**
 * `true` se `value` cade nel bucket, con confine condiviso assegnato al bucket SUPERIORE (un
 * valore esattamente al limite appartiene al bucket successivo, non a quello corrente). Il limite
 * inferiore è sempre inclusivo; il limite superiore è escluso a meno che il bucket sia aperto
 * (`max == null`).
 * @param value Valore numerico da collocare.
 * @param bucket Bucket candidato.
 * @param isFirstBucket `true` se `bucket` è il primo della serie ordinata (non influisce più sul
 * risultato: mantenuto per compatibilità con i call site esistenti).
 */
export function bucketMatches(value: number, bucket: NumericBucket, isFirstBucket: boolean): boolean {
  const aboveMin = value >= bucket.min;
  const belowMax = bucket.max == null || value < bucket.max;
  return aboveMin && belowMax;
}

/**
 * Risolve l'etichetta di un valore tradotto per la lingua attiva, con fallback a cascata
 * `lingua attiva → it → en → prima disponibile`. Non traduce mai i codici lato client.
 * @param name Oggetto tradotto per lingua fornito dal backend.
 * @param lang Lingua attiva.
 */
export function localizedLabel(
  name: Partial<Record<Language, string>> | undefined,
  lang: Language,
): string {
  if (!name) return '';
  return name[lang] ?? name.it ?? name.en ?? Object.values(name).find(v => !!v) ?? '';
}

/** Opzioni di un attributo a valore singolo con vocabolario APERTO (shape), deduplicate e ordinate per etichetta, derivate scansionando i dati. */
export function singleValueOptions<T extends string>(
  layers: ILAYER[],
  key: 'shape' | 'walking_network',
  lang: Language,
  exclude: T[] = [],
): FilterOption[] {
  const map = new Map<string, FilterOption>();
  for (const layer of layers) {
    const attr = layer.attributes?.[key] as LayerAttributeValue<T> | undefined;
    if (!attr || exclude.includes(attr.value)) continue;
    const existing = map.get(attr.value);
    if (existing) existing.count++;
    else map.set(attr.value, {value: attr.value, label: localizedLabel(attr.name, lang), count: 1});
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, lang));
}

/** Opzioni di un attributo a lista con vocabolario APERTO (taxonomy_where, themes): un cammino multi-valore contribuisce al count di ognuno dei suoi valori, derivate scansionando i dati. */
export function listValueOptions(
  layers: ILAYER[],
  key: 'taxonomy_where' | 'themes',
  lang: Language,
): FilterOption[] {
  const map = new Map<string, FilterOption>();
  for (const layer of layers) {
    for (const attr of layer.attributes?.[key] ?? []) {
      const existing = map.get(attr.value);
      if (existing) existing.count++;
      else map.set(attr.value, {value: attr.value, label: localizedLabel(attr.name, lang), count: 1});
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, lang));
}

/**
 * Opzioni di un attributo a valore singolo con vocabolario CHIUSO e noto a priori (walking_network
 * — 4 valori OSM fissi, stesso enum del backend `OsmWalkingNetwork`): a differenza di
 * `singleValueOptions`, itera sempre su TUTTI i valori possibili (`allValues`, nell'ordine
 * dell'enum), non solo su quelli presenti nei dati — un valore mai usato da nessun layer compare
 * comunque, con count 0. La label non può derivare dai dati in questo caso (nessun layer la
 * porterebbe), quindi arriva da `labelResolver` (i18n statico lato frontend, chiave = valore
 * enum — es. `'lwn'`), non dal payload del layer.
 * @param layers Layer su cui contare le occorrenze.
 * @param key Chiave dell'attributo.
 * @param allValues Tutti i valori possibili dell'enum, nell'ordine di visualizzazione.
 * @param labelResolver Risolve l'etichetta tradotta per un valore dell'enum.
 */
export function fixedSingleValueOptions<T extends string>(
  layers: ILAYER[],
  key: 'walking_network',
  allValues: readonly T[],
  labelResolver: (value: T) => string,
): FilterOption[] {
  return allValues.map(value => {
    const count = layers.filter(layer => layer.attributes?.[key]?.value === value).length;
    return {value, label: labelResolver(value), count};
  });
}

/**
 * Opzioni di un attributo a lista con vocabolario CHIUSO e noto a priori (season — 4 valori fissi,
 * stesso enum del backend `Season`): come `fixedSingleValueOptions`, ma per attributi a lista.
 * @param layers Layer su cui contare le occorrenze.
 * @param key Chiave dell'attributo.
 * @param allValues Tutti i valori possibili dell'enum, nell'ordine di visualizzazione.
 * @param labelResolver Risolve l'etichetta tradotta per un valore dell'enum.
 */
export function fixedListValueOptions<T extends string>(
  layers: ILAYER[],
  key: 'season',
  allValues: readonly T[],
  labelResolver: (value: T) => string,
): FilterOption[] {
  return allValues.map(value => {
    const count = layers.filter(layer => (layer.attributes?.[key] ?? []).some(v => v.value === value)).length;
    return {value, label: labelResolver(value), count};
  });
}

/**
 * Etichetta leggibile di un bucket con l'unità di misura (es. "5-10 tappe", ">20 tappe") — fedele
 * al riferimento camminiditalia.org, dove la pillola/opzione mostra sempre il numero con l'unità,
 * mai il solo intervallo.
 * @param bucket Bucket da descrivere.
 * @param unit Unità di misura già tradotta per la lingua attiva (es. "tappe", "km").
 */
export function bucketLabel(bucket: NumericBucket, unit: string): string {
  return bucket.max == null ? `>${bucket.min} ${unit}` : `${bucket.min}-${bucket.max} ${unit}`;
}

/** Opzioni a bucket fisso per un attributo numerico (distance, stage_count), col relativo count di layer. */
export function numericBucketOptions(
  layers: ILAYER[],
  key: 'distance' | 'stage_count',
  buckets: NumericBucket[],
  unit: string,
): FilterOption[] {
  return buckets.map((bucket, index) => {
    const count = layers.filter(layer => {
      const value = layer.attributes?.[key];
      return typeof value === 'number' && bucketMatches(value, bucket, index === 0);
    }).length;
    return {value: bucket.id, label: bucketLabel(bucket, unit), count};
  });
}

function matchesBucketSelection(
  value: number | undefined,
  selectedIds: string[] | undefined,
  buckets: NumericBucket[],
): boolean {
  if (!selectedIds?.length) return true;
  if (typeof value !== 'number') return false;
  return selectedIds.some(id => {
    const index = buckets.findIndex(b => b.id === id);
    return index >= 0 && bucketMatches(value, buckets[index], index === 0);
  });
}

function matchesSingleValue<T extends string>(
  attr: LayerAttributeValue<T> | undefined,
  selected: T[] | undefined,
): boolean {
  if (!selected?.length) return true;
  return !!attr && selected.includes(attr.value);
}

function matchesListValue(attrs: LayerAttributeValue[] | undefined, selected: string[] | undefined): boolean {
  if (!selected?.length) return true;
  return (attrs ?? []).some(a => selected.includes(a.value));
}

/**
 * Predicato di filtro: AND tra dropdown diversi, OR dentro lo stesso dropdown. Un attributo
 * assente sul layer lo esclude solo se il relativo filtro è attivo (array non vuoto).
 * @param layer Layer da verificare.
 * @param filters Stato corrente dei filtri.
 */
export function layerMatchesFilters(layer: ILAYER, filters: RouteFilterState): boolean {
  const attrs = layer.attributes;
  if (!matchesBucketSelection(attrs?.distance, filters.distance, DISTANCE_BUCKETS)) return false;
  if (!matchesBucketSelection(attrs?.stage_count, filters.stageCount, STAGE_COUNT_BUCKETS)) return false;
  if (!matchesSingleValue(attrs?.shape, filters.shape)) return false;
  if (!matchesSingleValue(attrs?.walking_network, filters.walkingNetwork)) return false;
  if (!matchesListValue(attrs?.taxonomy_where, filters.regions)) return false;
  if (!matchesListValue(attrs?.themes, filters.themes)) return false;
  if (!matchesListValue(attrs?.season, filters.seasons)) return false;
  return true;
}

/** `true` se almeno un filtro ha una selezione non vuota. */
export function hasActiveFilters(filters: RouteFilterState | null | undefined): boolean {
  if (!filters) return false;
  return Object.values(filters).some(v => Array.isArray(v) && v.length > 0);
}
