# Filtri sui cammini in Home — componente frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Ticket: oc:8414

**Goal:** Costruire in Home il componente "Cerca il tuo cammino": search box esistente + toggle + 7 filtri ad accordion (Lunghezza, Tappe, Tipologia, Portata, Regioni, Temi, Stagioni) che filtrano client-side, in tempo reale, la lista dei cammini mostrata in Home — generico, si nasconde da solo quando nessun layer ha `attributes`.

**Architecture:** Stato del filtro (`RouteFilterState`) vive nello slice NgRx esistente `userActivity` (stesso pattern già usato per `inputTyped`/`filterTracks`/`layer`), non in un nuovo feature module — evita l'overhead di registrare uno store slice dedicato per uno stato che è puramente derivato/ephemeral. Un nuovo selettore `confHOMEFiltered` (in `user-activity.selector.ts`, che già compone stato `userActivity` con selettori di `conf`) filtra i box `layer` di `confHOME` col predicato puro `layerMatchesFilters()`; lo stesso predicato viene applicato anche in `home-result.component.ts` per coprire il caso "search box + filtri combinati" (l'app passa dalla griglia `wm-home-landing` alla lista `wm-home-result` non appena l'utente digita del testo). Le opzioni dei 7 filtri (multi-select dinamiche, bucket fissi per i due numerici) sono funzioni pure testate in isolamento, senza `TestBed` — coerente con la difficoltà nota in questo repo di istanziare componenti Angular in Karma (`NG0201` su `APP_TRANSLATION`, vedi CLAUDE.md).

**Tech Stack:** Angular 20 (standalone: false), NgRx 20, Ionic 8, Karma/Jasmine (solo per moduli puri), Cypress 14 (E2E, nel repo principale).

**Spec:** `docs/features/8414-filtri-cammini-home/overview.md` (questo repo). Vedi anche il plan gemello in `wm-types` (`docs/features/8414-filtri-cammini-home/plan.md`, da eseguire per primo: `wm-core` dipende dai suoi tipi).

## Global Constraints

- Nessuna modifica al backend, a `FiltersComponent`/`wm-select-filter`/`wm-slider-filter` (drawer filtri mappa), a `map-core`, né validazione runtime del payload (zod/io-ts) — tutti fuori scope, vedi overview.
- Nessun flag `OPTIONS` di kill-switch: la visibilità del componente dipende solo dalla presenza di `attributes` su almeno un layer (decisione esplicita, rischio accettato — vedi overview, sezione Rischi).
- `shape: "discontinuous"` non è mai un'opzione del filtro Tipologia; i cammini che lo hanno restano visibili quando quel filtro non è attivo.
- Bucket numerici (Lunghezza/Tappe) a soglie **fisse**: confine condiviso incluso nel bucket **superiore** (es. esattamente 5 tappe → bucket "5-10", non "0-5"), eccetto il limite inferiore del primo bucket (inclusivo, non esiste un bucket precedente).
- Etichetta del filtro su `stage_count` è **"Tappe"**, mai "Durata".
- CTA finale: **"Andiamo!"** (mai "Tutti i risultati") + **"Azzera filtri"** (visibile solo se almeno un filtro è attivo).
- Semantica filtro: AND tra dropdown diversi, OR dentro lo stesso dropdown, search box in AND con i dropdown; attributo assente sul layer = escluso solo se quel filtro è attivo.
- JSDoc breve (una riga se il nome non basta) su ogni funzione/metodo pubblico esportato — enforced da ESLint in questo repo.
- Naming: `ILAYER` mantiene il prefisso `I` (convenzione esistente in questo file, non toccarla); i nuovi tipi introdotti da questa feature in wm-core (`RouteFilterState`, `FilterOption`, `NumericBucket`, `RouteFilterKey`) seguono invece lo stile senza prefisso già in uso per i tipi più recenti del repo (es. `RemainingDistanceContext`, oc:8177).
- Component: `standalone: false`, `ChangeDetectionStrategy.OnPush`, `ViewEncapsulation.None` — stesso pattern di tutti i componenti vicini in `home/`.

---

### Task 1: Estendere `ILAYER` con `attributes`

**Files:**
- Modify: `projects/wm-core/src/types/config.ts`

**Interfaces:**
- Consumes: `LayerAttributes` da `@wm-types/config` (prodotto dal Task 1 del plan.md di `wm-types`, deve essere già eseguito)
- Produces: `ILAYER.attributes?: LayerAttributes` — consumato da tutti i task successivi di questo piano

- [ ] **Step 1: Aggiungere l'import e il campo**

In `core/src/app/shared/wm-core/projects/wm-core/src/types/config.ts`, aggiungere l'import in cima al file (accanto agli altri import da `@wm-types/*`):

```typescript
import {LayerAttributes} from '@wm-types/config';
```

Poi, dentro l'interfaccia `ILAYER`, subito dopo il campo `config_detail?: ConfigDetailBox[];` esistente, aggiungere:

```typescript
  /** Caratteristiche del cammino usate dai filtri Home (oc:8180). Assente se nessun valore è disponibile (es. cammino senza tappe). Tipi in `@wm-types/config`. */
  attributes?: LayerAttributes;
```

- [ ] **Step 2: Verificare che il progetto compili**

Run: `cd core && npx tsc --noEmit`

Expected: nessun nuovo errore introdotto da questa modifica (il file ha `noImplicitAny`/`strict` attivi per l'intero progetto — vedi CLAUDE.md).

- [ ] **Step 3: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/types/config.ts
git commit -m "feat(oc:8414): add attributes field to ILAYER"
```

---

### Task 2: Logica pura di derivazione opzioni e predicato di filtro

**Files:**
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filters.utils.ts`
- Test: `projects/wm-core/src/home/home-route-filters/home-route-filters.utils.spec.ts`

**Interfaces:**
- Consumes: `ILAYER` da `@wm-core/types/config`; `Language` da `@wm-types/language`; `LayerAttributeValue`, `RouteShape`, `WalkingNetwork`, `Season` da `@wm-types/config`
- Produces (usati dai Task 3, 5, 6):
  - `interface FilterOption { value: string; label: string; count: number }`
  - `interface NumericBucket { id: string; min: number; max: number | null; unitKey: string }`
  - `const STAGE_COUNT_BUCKETS: NumericBucket[]`, `const DISTANCE_BUCKETS: NumericBucket[]`
  - `interface RouteFilterState { distance?: string[]; stageCount?: string[]; shape?: RouteShape[]; walkingNetwork?: WalkingNetwork[]; regions?: string[]; themes?: string[]; seasons?: Season[] }`
  - `type RouteFilterKey = keyof RouteFilterState`
  - `function hasActiveFilters(filters: RouteFilterState | null | undefined): boolean`
  - `function localizedLabel(name: Partial<Record<Language, string>> | undefined, lang: Language): string`
  - `function singleValueOptions<T extends string>(layers: ILAYER[], key: 'shape' | 'walking_network', lang: Language, exclude?: T[]): FilterOption[]`
  - `function listValueOptions(layers: ILAYER[], key: 'taxonomy_where' | 'themes' | 'season', lang: Language): FilterOption[]`
  - `function numericBucketOptions(layers: ILAYER[], key: 'distance' | 'stage_count', buckets: NumericBucket[]): FilterOption[]`
  - `function bucketMatches(value: number, bucket: NumericBucket, isFirstBucket: boolean): boolean`
  - `function layerMatchesFilters(layer: ILAYER, filters: RouteFilterState): boolean`

- [ ] **Step 1: Scrivere i test che falliscono, per `bucketMatches`**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filters.utils.spec.ts`:

```typescript
import {bucketMatches, NumericBucket} from './home-route-filters.utils';

describe('bucketMatches', () => {
  const buckets: NumericBucket[] = [
    {id: '0-5', min: 0, max: 5, unitKey: 'tappe'},
    {id: '5-10', min: 5, max: 10, unitKey: 'tappe'},
    {id: '10-20', min: 10, max: 20, unitKey: 'tappe'},
    {id: '20+', min: 20, max: null, unitKey: 'tappe'},
  ];

  it('include il valore minimo assoluto nel primo bucket (limite inferiore sempre inclusivo)', () => {
    expect(bucketMatches(0, buckets[0], true)).toBe(true);
  });

  it('assegna un valore esattamente al confine condiviso al bucket SUPERIORE, non a quello inferiore', () => {
    expect(bucketMatches(5, buckets[0], true)).toBe(false);
    expect(bucketMatches(5, buckets[1], false)).toBe(true);
  });

  it('assegna il limite superiore condiviso al bucket successivo, non a quello corrente (mutua esclusione)', () => {
    expect(bucketMatches(10, buckets[1], false)).toBe(false);
    expect(bucketMatches(10, buckets[2], false)).toBe(true);
  });

  it('gestisce il bucket aperto (max null) senza limite superiore', () => {
    expect(bucketMatches(999, buckets[3], false)).toBe(true);
  });

  it('esclude un valore sotto il minimo del bucket', () => {
    expect(bucketMatches(4, buckets[1], false)).toBe(false);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `cd core && npx karma start --single-run --include home-route-filters.utils.spec.ts 2>&1 | tail -30`

Se il runner Karma di questo repo non supporta `--include` per singolo file (verificare `karma.conf.js`), eseguire semplicemente `npm run test -- --include='**/home-route-filters.utils.spec.ts'` oppure la variante equivalente già documentata nello script `test` di `core/package.json`.

Expected: FAIL — `Cannot find module './home-route-filters.utils'` (il file non esiste ancora).

- [ ] **Step 3: Implementare `bucketMatches` e i tipi base**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filters.utils.ts`:

```typescript
import {Language} from '@wm-types/language';
import {LayerAttributeValue, RouteShape, Season, WalkingNetwork} from '@wm-types/config';
import {ILAYER} from '@wm-core/types/config';

/** Una voce selezionabile in un filtro: codice stabile, etichetta risolta per la lingua attiva, numero di cammini che la soddisfano. */
export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/** Un bucket a soglia fissa per un filtro numerico (Lunghezza/Tappe). `max: null` = nessun limite superiore. */
export interface NumericBucket {
  id: string;
  min: number;
  max: number | null;
  /** Chiave i18n dell'unità di misura mostrata accanto al numero (es. 'tappe', 'km'). */
  unitKey: string;
}

/** Soglie fisse per il filtro Tappe, fedeli a camminiditalia.org — verificate contro la distribuzione reale (min 2, max 99, quartili ~5/7/11 sui 117 layer con dati al momento della pianificazione). */
export const STAGE_COUNT_BUCKETS: NumericBucket[] = [
  {id: '0-5', min: 0, max: 5, unitKey: 'tappe'},
  {id: '5-10', min: 5, max: 10, unitKey: 'tappe'},
  {id: '10-20', min: 10, max: 20, unitKey: 'tappe'},
  {id: '20+', min: 20, max: null, unitKey: 'tappe'},
];

/** Soglie fisse per il filtro Lunghezza, derivate dalla distribuzione reale (min 13.5, max 1974.8, quartili ~83/114/184 km sui 109 layer con dati al momento della pianificazione). */
export const DISTANCE_BUCKETS: NumericBucket[] = [
  {id: '0-50', min: 0, max: 50, unitKey: 'km'},
  {id: '50-100', min: 50, max: 100, unitKey: 'km'},
  {id: '100-200', min: 100, max: 200, unitKey: 'km'},
  {id: '200+', min: 200, max: null, unitKey: 'km'},
];

/** Stato corrente dei 7 filtri Home. Ogni chiave assente/vuota = filtro non attivo. */
export interface RouteFilterState {
  distance?: string[];
  stageCount?: string[];
  shape?: RouteShape[];
  walkingNetwork?: WalkingNetwork[];
  regions?: string[];
  themes?: string[];
  seasons?: Season[];
}

export type RouteFilterKey = keyof RouteFilterState;

/**
 * `true` se `value` cade nel bucket: intervallo semiaperto `[min, max)`, limite inferiore sempre
 * incluso, limite superiore sempre escluso a meno che il bucket sia aperto (`max === null`). Un
 * valore esattamente al confine condiviso tra due bucket adiacenti appartiene così sempre al
 * bucket SUPERIORE (il cui `min` coincide con quel valore), mai a quello inferiore — bucket
 * mutuamente esclusivi per costruzione, nessun doppio conteggio.
 * @param value Valore numerico da collocare.
 * @param bucket Bucket candidato.
 * @param isFirstBucket Non influisce più sul risultato (il limite inferiore è già inclusivo per
 * ogni bucket): mantenuto nella firma per compatibilità con i chiamanti (`numericBucketOptions`,
 * `matchesBucketSelection`), che continuano a passare `index === 0` senza doverla rimuovere.
 */
export function bucketMatches(value: number, bucket: NumericBucket, isFirstBucket: boolean): boolean {
  const aboveMin = value >= bucket.min;
  const belowMax = bucket.max == null || value < bucket.max;
  return aboveMin && belowMax;
}
```

> **Nota post-review (Task 2, fix round 1):** la versione originale di questa funzione (con `isFirstBucket` che condizionava anche il limite inferiore, e limite superiore sempre inclusivo) permetteva bucket sovrapposti — un valore esattamente al confine condiviso (es. 10) risultava in ENTRAMBI i bucket adiacenti, in contraddizione con la decisione di reverse-interaction ("bucket mutuamente esclusivi, confine al bucket superiore"). Corretto durante l'esecuzione, prima che qualunque altro task ne dipendesse. Il codice sopra è già la versione corretta.

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `cd core && npm run test -- --include='**/home-route-filters.utils.spec.ts'`

Expected: PASS — 5 test verdi.

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home-route-filters/home-route-filters.utils.ts \
        projects/wm-core/src/home/home-route-filters/home-route-filters.utils.spec.ts
git commit -m "feat(oc:8414): add bucket matching for numeric route filters"
```

- [ ] **Step 6: Scrivere i test che falliscono, per `localizedLabel` e le funzioni di derivazione opzioni**

Aggiungere in coda a `home-route-filters.utils.spec.ts`:

```typescript
import {
  layerMatchesFilters,
  listValueOptions,
  localizedLabel,
  numericBucketOptions,
  singleValueOptions,
  STAGE_COUNT_BUCKETS,
} from './home-route-filters.utils';
import {ILAYER} from '@wm-core/types/config';

describe('localizedLabel', () => {
  it('usa la lingua attiva quando disponibile', () => {
    expect(localizedLabel({it: 'Anello', en: 'Roundtrip'}, 'it')).toBe('Anello');
  });

  it('ricade su it se la lingua attiva manca', () => {
    expect(localizedLabel({it: 'Anello', en: 'Roundtrip'}, 'fr' as any)).toBe('Anello');
  });

  it('ricade sulla prima traduzione disponibile se manca anche it/en', () => {
    expect(localizedLabel({de: 'Rundweg'}, 'fr' as any)).toBe('Rundweg');
  });

  it('ritorna stringa vuota se non c\'è alcuna traduzione', () => {
    expect(localizedLabel(undefined, 'it')).toBe('');
    expect(localizedLabel({}, 'it')).toBe('');
  });
});

function makeLayer(id: string, attributes: ILAYER['attributes']): ILAYER {
  return {id, attributes} as ILAYER;
}

describe('singleValueOptions', () => {
  it('deduplica i valori e conta le occorrenze, ordinando per etichetta (non per value)', () => {
    const layers = [
      makeLayer('1', {shape: {value: 'discontinuous', name: {it: 'Discontinuo'}}}),
      makeLayer('2', {shape: {value: 'discontinuous', name: {it: 'Discontinuo'}}}),
      makeLayer('3', {shape: {value: 'roundtrip', name: {it: 'Anello'}}}),
    ];
    const options = singleValueOptions(layers, 'shape', 'it');
    // 'Anello' < 'Discontinuo' alfabeticamente, anche se value 'discontinuous' < 'roundtrip' —
    // dimostra che l'ordine segue la label, non il value (valori RouteShape validi, per tipizzare
    // correttamente contro LayerAttributes — l'esclusione di 'discontinuous' dalle opzioni reali è
    // responsabilità del chiamante, `exclude`, non di questa funzione generica).
    expect(options).toEqual([
      {value: 'roundtrip', label: 'Anello', count: 1},
      {value: 'discontinuous', label: 'Discontinuo', count: 2},
    ]);
  });

  it('esclude i valori passati in `exclude` (es. discontinuous)', () => {
    const layers = [
      makeLayer('1', {shape: {value: 'discontinuous', name: {it: 'Discontinuo'}}}),
      makeLayer('2', {shape: {value: 'linear', name: {it: 'Lineare'}}}),
    ];
    const options = singleValueOptions(layers, 'shape', 'it', ['discontinuous']);
    expect(options).toEqual([{value: 'linear', label: 'Lineare', count: 1}]);
  });

  it('ignora i layer senza attributes o senza il campo richiesto', () => {
    const layers = [makeLayer('1', undefined), makeLayer('2', {})];
    expect(singleValueOptions(layers, 'shape', 'it')).toEqual([]);
  });
});

describe('listValueOptions', () => {
  it('un cammino multi-regione contribuisce al count di ogni regione attraversata', () => {
    const layers = [
      makeLayer('1', {
        taxonomy_where: [
          {value: 'tuscany', name: {it: 'Toscana'}},
          {value: 'umbria', name: {it: 'Umbria'}},
        ],
      }),
      makeLayer('2', {taxonomy_where: [{value: 'tuscany', name: {it: 'Toscana'}}]}),
    ];
    const options = listValueOptions(layers, 'taxonomy_where', 'it');
    expect(options).toEqual([
      {value: 'tuscany', label: 'Toscana', count: 2},
      {value: 'umbria', label: 'Umbria', count: 1},
    ]);
  });
});

describe('numericBucketOptions', () => {
  it('conta i layer per bucket, un cammino con 5 tappe esatte va nel bucket "5-10"', () => {
    const layers = [
      makeLayer('1', {stage_count: 3}),
      makeLayer('2', {stage_count: 5}),
      makeLayer('3', {stage_count: 30}),
    ];
    const options = numericBucketOptions(layers, 'stage_count', STAGE_COUNT_BUCKETS);
    expect(options).toEqual([
      {value: '0-5', label: '0-5', count: 1},
      {value: '5-10', label: '5-10', count: 1},
      {value: '10-20', label: '10-20', count: 0},
      {value: '20+', label: '20+', count: 1},
    ]);
  });
});

describe('layerMatchesFilters', () => {
  it('nessun filtro attivo = tutti i cammini passano', () => {
    expect(layerMatchesFilters(makeLayer('1', {}), {})).toBe(true);
  });

  it('AND tra dropdown diversi', () => {
    const layer = makeLayer('1', {
      shape: {value: 'roundtrip', name: {}},
      taxonomy_where: [{value: 'tuscany', name: {}}],
    });
    expect(layerMatchesFilters(layer, {shape: ['roundtrip'], regions: ['tuscany']})).toBe(true);
    expect(layerMatchesFilters(layer, {shape: ['linear'], regions: ['tuscany']})).toBe(false);
  });

  it('OR dentro lo stesso dropdown', () => {
    const layer = makeLayer('1', {taxonomy_where: [{value: 'tuscany', name: {}}]});
    expect(layerMatchesFilters(layer, {regions: ['tuscany', 'umbria']})).toBe(true);
  });

  it('attributo assente esclude il layer solo se il filtro è attivo', () => {
    const layer = makeLayer('1', {});
    expect(layerMatchesFilters(layer, {regions: ['tuscany']})).toBe(false);
    expect(layerMatchesFilters(layer, {})).toBe(true);
  });

  it('bucket numerico: un valore esattamente al confine cade nel bucket superiore selezionato', () => {
    const layer = makeLayer('1', {stage_count: 5});
    expect(layerMatchesFilters(layer, {stageCount: ['0-5']})).toBe(false);
    expect(layerMatchesFilters(layer, {stageCount: ['5-10']})).toBe(true);
  });
});
```

- [ ] **Step 7: Eseguire i test e verificare che falliscano**

Run: `cd core && npm run test -- --include='**/home-route-filters.utils.spec.ts'`

Expected: FAIL — `localizedLabel`, `singleValueOptions`, `listValueOptions`, `numericBucketOptions`, `layerMatchesFilters` non esistono ancora.

- [ ] **Step 8: Implementare le funzioni rimanenti**

Aggiungere in coda a `home-route-filters.utils.ts`:

```typescript
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

/** Opzioni di un attributo a valore singolo (shape, walking_network), deduplicate e ordinate per etichetta. */
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

/** Opzioni di un attributo a lista (taxonomy_where, themes, season): un cammino multi-valore contribuisce al count di ognuno dei suoi valori. */
export function listValueOptions(
  layers: ILAYER[],
  key: 'taxonomy_where' | 'themes' | 'season',
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

/** Opzioni a bucket fisso per un attributo numerico (distance, stage_count), col relativo count di layer. */
export function numericBucketOptions(
  layers: ILAYER[],
  key: 'distance' | 'stage_count',
  buckets: NumericBucket[],
): FilterOption[] {
  return buckets.map((bucket, index) => {
    const count = layers.filter(layer => {
      const value = layer.attributes?.[key];
      return typeof value === 'number' && bucketMatches(value, bucket, index === 0);
    }).length;
    return {value: bucket.id, label: bucket.id, count};
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
```

- [ ] **Step 9: Eseguire i test e verificare che passino**

Run: `cd core && npm run test -- --include='**/home-route-filters.utils.spec.ts'`

Expected: PASS — tutti i test verdi (bucket + label + opzioni + predicato).

- [ ] **Step 10: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home-route-filters/home-route-filters.utils.ts \
        projects/wm-core/src/home/home-route-filters/home-route-filters.utils.spec.ts
git commit -m "feat(oc:8414): add option derivation and filter predicate for route filters"
```

---

### Task 3: Stato NgRx (`routeFilters`) e selettori derivati

**Files:**
- Modify: `projects/wm-core/src/store/user-activity/user-activity.action.ts`
- Modify: `projects/wm-core/src/store/user-activity/user-activity.reducer.ts`
- Modify: `projects/wm-core/src/store/user-activity/user-activity.selector.ts`
- Modify: `projects/wm-core/src/store/conf/conf.selector.ts`
- Test: `projects/wm-core/src/store/user-activity/user-activity.reducer.spec.ts`

**Interfaces:**
- Consumes: `RouteFilterState`, `layerMatchesFilters` da `./home-route-filters.utils` (Task 2); `confHOME` da `../conf/conf.selector` (esistente); `confMAPLayers` da `../conf/conf.selector` (esistente, riga 33 del file)
- Produces (usati dai Task 4, 6, 7):
  - `routeFiltersChanged = createAction('[User Activity] set route filters', props<{filters: RouteFilterState}>())`
  - `routeFilters = createSelector(userActivity, state => state.routeFilters)` (in `user-activity.selector.ts`)
  - `confHOMEFiltered = createSelector(...)` (in `user-activity.selector.ts`) — stessa forma `IHOME[]` di `confHOME`, con i box `layer` non conformi ai filtri rimossi
  - `confShowRouteFilters = createSelector(confMAPLayers, ...)` (in `conf.selector.ts`) — `boolean`, `true` se almeno un layer ha `attributes` non nullo

- [ ] **Step 1: Scrivere il test che fallisce, per il reducer**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/store/user-activity/user-activity.reducer.spec.ts`:

```typescript
import {userActivityReducer, UserActivityState} from './user-activity.reducer';
import {routeFiltersChanged} from './user-activity.action';

describe('userActivityReducer — routeFiltersChanged', () => {
  it('sostituisce interamente routeFilters con il payload dell\'azione', () => {
    const initial = userActivityReducer(undefined, {type: '@@INIT'} as any);
    expect(initial.routeFilters).toEqual({});

    const afterFirst = userActivityReducer(
      initial,
      routeFiltersChanged({filters: {shape: ['roundtrip']}}),
    );
    expect(afterFirst.routeFilters).toEqual({shape: ['roundtrip']});

    const afterReset = userActivityReducer(afterFirst, routeFiltersChanged({filters: {}}));
    expect(afterReset.routeFilters).toEqual({});
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `cd core && npm run test -- --include='**/user-activity.reducer.spec.ts'`

Expected: FAIL — `routeFiltersChanged` non esiste, `state.routeFilters` è `undefined` nello stato iniziale.

- [ ] **Step 3: Aggiungere l'azione**

In `core/src/app/shared/wm-core/projects/wm-core/src/store/user-activity/user-activity.action.ts`, aggiungere in coda al file:

```typescript
import {RouteFilterState} from '@wm-core/home/home-route-filters/home-route-filters.utils';

export const routeFiltersChanged = createAction(
  '[User Activity] set route filters',
  props<{filters: RouteFilterState}>(),
);
```

- [ ] **Step 4: Estendere lo stato e il reducer**

In `user-activity.reducer.ts`:

1. Aggiungere l'import: `import {routeFiltersChanged} from './user-activity.action';` (nella lista di import già esistente dallo stesso file, riga 8 circa) e `import {RouteFilterState} from '@wm-core/home/home-route-filters/home-route-filters.utils';`.
2. Aggiungere il campo all'interfaccia `UserActivityState` (dopo `trackPositionStale: boolean;`):

```typescript
  routeFilters: RouteFilterState;
```

3. Aggiungere il valore iniziale in `initialState` (dopo `trackPositionStale: false,`):

```typescript
  routeFilters: {},
```

4. Aggiungere l'handler in `userActivityReducer` (dopo `on(resetTrackRemainingDistance, ...)`, prima della chiusura `);`):

```typescript
  on(routeFiltersChanged, (state, {filters}) => ({
    ...state,
    routeFilters: filters,
  })),
```

- [ ] **Step 5: Eseguire il test e verificare che passi**

Run: `cd core && npm run test -- --include='**/user-activity.reducer.spec.ts'`

Expected: PASS.

- [ ] **Step 6: Aggiungere i selettori `routeFilters` e `confHOMEFiltered`**

In `core/src/app/shared/wm-core/projects/wm-core/src/store/user-activity/user-activity.selector.ts`, aggiungere l'import in cima (accanto agli import già esistenti da `../conf/conf.selector`):

```typescript
import {confHOME} from '../conf/conf.selector';
import {IHOME, ILAYERBOX} from '../../types/config';
import {layerMatchesFilters} from '../../home/home-route-filters/home-route-filters.utils';
```

Poi aggiungere in coda al file:

```typescript
export const routeFilters = createSelector(userActivity, state => state.routeFilters);

export const hasActiveRouteFilters = createSelector(
  routeFilters,
  filters => Object.values(filters ?? {}).some(v => Array.isArray(v) && v.length > 0),
);

/**
 * Come `confHOME`, ma con i box `layer` che non soddisfano i filtri Home rimossi. Nessun filtro
 * attivo = identico a `confHOME`. I box di altro tipo (title, ecc.) non vengono mai filtrati.
 */
export const confHOMEFiltered = createSelector(confHOME, routeFilters, (home, filters) => {
  if (!home) return home;
  if (!filters || Object.keys(filters).length === 0) return home;
  return (home as IHOME[]).filter(el => {
    if (el.box_type !== 'layer') return true;
    const layerBox = el as ILAYERBOX;
    return layerBox.layer == null || layerMatchesFilters(layerBox.layer, filters);
  });
});
```

- [ ] **Step 7: Aggiungere il selettore `confShowRouteFilters`**

In `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.selector.ts`, aggiungere subito dopo la riga esistente `export const confMAPLayers = createSelector(confMAP, state => state.layers);`:

```typescript
/** `true` se almeno un layer della config ha `attributes` popolato — gate di visibilità del componente filtri Home (oc:8414), nessun flag `OPTIONS` dedicato. */
export const confShowRouteFilters = createSelector(confMAPLayers, layers =>
  (layers ?? []).some(l => l.attributes != null),
);
```

- [ ] **Step 8: Verificare che il progetto compili e i test passino**

Run: `cd core && npx tsc --noEmit && npm run test -- --include='**/user-activity.reducer.spec.ts'`

Expected: nessun errore di tipo, test verdi.

- [ ] **Step 9: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/store/user-activity/user-activity.action.ts \
        projects/wm-core/src/store/user-activity/user-activity.reducer.ts \
        projects/wm-core/src/store/user-activity/user-activity.reducer.spec.ts \
        projects/wm-core/src/store/user-activity/user-activity.selector.ts \
        projects/wm-core/src/store/conf/conf.selector.ts
git commit -m "feat(oc:8414): add routeFilters state and confHOMEFiltered selector"
```

---

### Task 4: Applicare il filtro alla griglia Home e ai risultati di ricerca

**Files:**
- Modify: `projects/wm-core/src/home/home-landing/home-landing.component.ts`
- Modify: `projects/wm-core/src/home/home-result/home-result.component.ts`

**Interfaces:**
- Consumes: `confHOMEFiltered` (Task 3); `routeFilters`, `layerMatchesFilters` (Task 2/3)
- Produces: nessuna nuova interfaccia pubblica — entrambi i componenti restano con la stessa API (`@Input`/`@Output`) di oggi

- [ ] **Step 1: `home-landing.component.ts` — usare `confHOMEFiltered` invece di `confHOME`**

In `core/src/app/shared/wm-core/projects/wm-core/src/home/home-landing/home-landing.component.ts`:

1. Sostituire l'import `import {confHOME} from '@wm-core/store/conf/conf.selector';` con `import {confHOMEFiltered} from '@wm-core/store/user-activity/user-activity.selector';`.
2. Sostituire la riga `confHOME$: Observable<IHOME[] | undefined> = this._store.select(confHOME);` con:

```typescript
  confHOME$: Observable<IHOME[] | undefined> = this._store.select(confHOMEFiltered);
```

Il template (`home-landing.component.html`) e il resto del componente non cambiano: iterano già su `confHOME$` per nome di proprietà, non sanno se la sorgente è filtrata.

- [ ] **Step 2: `home-result.component.ts` — combinare `routeFilters` col filtro testuale esistente**

In `core/src/app/shared/wm-core/projects/wm-core/src/home/home-result/home-result.component.ts`:

1. Aggiungere l'import: `import {routeFilters} from '@wm-core/store/user-activity/user-activity.selector';` (accanto agli altri import dallo stesso file, riga 32 circa) e `import {layerMatchesFilters} from '@wm-core/home/home-route-filters/home-route-filters.utils';`.
2. Sostituire il blocco che assegna `this.filteredLayers$` nel costruttore con:

```typescript
    this.filteredLayers$ = combineLatest([
      this._store.select(confHOMELayers),
      this._store.select(inputTyped),
      this._store.select(routeFilters),
    ]).pipe(
      debounceTime(300),
      map(([layers, input, filters]) => {
        if (!input || input.trim() === '') return [];
        if (!layers) return [];
        const normalized = normalizeString(input);
        return layers.filter(layer => {
          if (!layer.title) return false;
          const title = this._langSvc.instant(layer.title as any);
          if (!title || typeof title !== 'string') return false;
          if (!normalizeString(title).includes(normalized)) return false;
          return layerMatchesFilters(layer, filters ?? {});
        });
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a.map(l => l.id)) === JSON.stringify(b.map(l => l.id))),
    );
```

Nota: il filtro testuale su `title` resta invariato (limite noto, fuori scope — vedi overview, sezione Rischi); l'unica aggiunta è il predicato `layerMatchesFilters` in AND dopo il match sul titolo.

- [ ] **Step 3: Verificare che il progetto compili**

Run: `cd core && npx tsc --noEmit`

Expected: nessun errore.

- [ ] **Step 4: Verifica manuale nel browser**

Run: `npm start` (dalla root del repo, o `cd core && npm start`), aprire l'app su `http://localhost:4200`, verificare che la Home carichi normalmente (nessun filtro attivo → nessuna differenza visibile rispetto a prima, dato che `confHOMEFiltered`/`filteredLayers$` con `routeFilters: {}` restituiscono esattamente l'input non filtrato — verificato dalla logica di `confHOMEFiltered`/`layerMatchesFilters`, Task 2/3).

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home-landing/home-landing.component.ts \
        projects/wm-core/src/home/home-result/home-result.component.ts
git commit -m "feat(oc:8414): apply route filters to home landing grid and search results"
```

---

### Task 5: `HomeRouteFilterRowComponent` — riga accordion riusabile

**Files:**
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filter-row/home-route-filter-row.component.ts`
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filter-row/home-route-filter-row.component.html`
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filter-row/home-route-filter-row.component.scss`
- Modify: `projects/wm-core/src/wm-core.module.ts`

**Interfaces:**
- Consumes: `FilterOption` da `../home-route-filters.utils` (Task 2)
- Produces: componente `wm-home-route-filter-row` con `@Input() label: string`, `@Input() open: boolean`, `@Input() options: FilterOption[]`, `@Input() selected: string[]`, `@Output() toggleEVT: EventEmitter<void>`, `@Output() selectionChangeEVT: EventEmitter<string[]>`, `@Output() doneEVT: EventEmitter<void>` — consumato dal Task 6

- [ ] **Step 1: Creare il componente**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filter-row/home-route-filter-row.component.ts`:

```typescript
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {FilterOption} from '../home-route-filters.utils';

/**
 * Riga accordion per un singolo filtro Home "Cerca il tuo cammino" (oc:8414): header con icona
 * proiettata, etichetta e chevron, pannello con opzioni multi-select e pulsante "Fatto".
 * Apertura esclusiva tra le 7 righe gestita dal genitore (`WmHomeRouteFiltersComponent`): questo
 * componente è puramente controllato via `[open]`/`(toggleEVT)`, non tiene stato di apertura
 * proprio — stesso principio di `wm-config-detail` (apertura esclusiva per riferimento, tracciata
 * nel genitore), qui applicato tra istanze sorelle invece che tra item dello stesso componente.
 */
@Component({
  standalone: false,
  selector: 'wm-home-route-filter-row',
  templateUrl: './home-route-filter-row.component.html',
  styleUrls: ['./home-route-filter-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HomeRouteFilterRowComponent {
  @Input() label = '';
  @Input() open = false;
  @Input() options: FilterOption[] = [];
  @Input() selected: string[] = [];

  @Output() doneEVT: EventEmitter<void> = new EventEmitter<void>();
  @Output() selectionChangeEVT: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() toggleEVT: EventEmitter<void> = new EventEmitter<void>();

  /** Prefisso univoco per istanza, per id/aria-controls non duplicati con più righe filtro nella stessa pagina. */
  readonly uid = Math.random().toString(36).slice(2);

  /**
   * `true` se `value` è tra quelli selezionati.
   * @param value Valore dell'opzione da verificare.
   */
  isSelected(value: string): boolean {
    return this.selected.includes(value);
  }

  /**
   * Alterna la selezione di `value` (multi-select, semantica OR) ed emette la nuova selezione.
   * @param value Valore dell'opzione alternata.
   */
  toggleOption(value: string): void {
    const next = this.isSelected(value)
      ? this.selected.filter(v => v !== value)
      : [...this.selected, value];
    this.selectionChangeEVT.emit(next);
  }
}
```

- [ ] **Step 2: Creare il template**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filter-row/home-route-filter-row.component.html`:

```html
<div class="wm-home-route-filter-row" [class.wm-home-route-filter-row--open]="open">
  <button
    type="button"
    class="wm-home-route-filter-row-header"
    [attr.aria-expanded]="open"
    [attr.aria-controls]="'wm-home-route-filter-row-' + uid + '-content'"
    (click)="toggleEVT.emit()"
  >
    <span class="wm-home-route-filter-row-icon"><ng-content select="[filter-icon]"></ng-content></span>
    <span class="wm-home-route-filter-row-label">{{ label }}</span>
    <span class="wm-home-route-filter-row-chevron">
      <ion-icon name="chevron-down-outline"></ion-icon>
    </span>
  </button>
  <div
    class="wm-home-route-filter-row-content"
    [id]="'wm-home-route-filter-row-' + uid + '-content'"
    *ngIf="open"
  >
    <label class="wm-home-route-filter-option" *ngFor="let option of options">
      <input
        type="checkbox"
        [checked]="isSelected(option.value)"
        [disabled]="option.count === 0"
        (change)="toggleOption(option.value)"
      />
      <span class="wm-home-route-filter-option-label">{{ option.label }}</span>
      <span class="wm-home-route-filter-option-count">({{ option.count }})</span>
    </label>
    <ion-button class="wm-home-route-filter-done" fill="outline" size="small" (click)="doneEVT.emit()">
      {{ 'Fatto' | wmtrans }}
    </ion-button>
  </div>
</div>
```

- [ ] **Step 3: Creare lo stile**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filter-row/home-route-filter-row.component.scss`:

```scss
.wm-home-route-filter-row {
  border: 1px solid var(--wm-color-medium, #d9d9d9);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;

  &--open {
    border-color: var(--wm-color-primary, #1a73e8);
  }
}

.wm-home-route-filter-row-header {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: none;
  border: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.wm-home-route-filter-row-icon {
  display: flex;
  align-items: center;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  color: var(--wm-color-medium-shade, #666);

  ::ng-deep svg {
    width: 100%;
    height: 100%;
  }
}

.wm-home-route-filter-row-label {
  flex: 1;
  font-weight: 600;
}

.wm-home-route-filter-row-chevron {
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;

  .wm-home-route-filter-row--open & {
    transform: rotate(180deg);
  }
}

.wm-home-route-filter-row-content {
  padding: 0 12px 12px;
}

.wm-home-route-filter-option {
  display: flex;
  align-items: center;
  min-height: 44px;
  gap: 8px;
  cursor: pointer;

  input[type='checkbox'] {
    width: 20px;
    height: 20px;
  }
}

.wm-home-route-filter-option-label {
  flex: 1;
}

.wm-home-route-filter-option-count {
  color: var(--wm-color-medium-shade, #666);
  font-size: 0.85em;
}

.wm-home-route-filter-done {
  margin-top: 8px;
  width: 100%;
}
```

- [ ] **Step 4: Registrare il componente in `wm-core.module.ts`**

In `core/src/app/shared/wm-core/projects/wm-core/src/wm-core.module.ts`:

1. Aggiungere l'import (accanto a `import {ConfigDetailComponent} from './config-detail/config-detail.component';`):

```typescript
import {HomeRouteFilterRowComponent} from './home/home-route-filters/home-route-filter-row/home-route-filter-row.component';
```

2. Aggiungere `HomeRouteFilterRowComponent` all'array `declarations` (accanto a `ConfigDetailComponent`).

- [ ] **Step 5: Verificare che il progetto compili**

Run: `cd core && npx tsc --noEmit`

Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home-route-filters/home-route-filter-row/ \
        projects/wm-core/src/wm-core.module.ts
git commit -m "feat(oc:8414): add HomeRouteFilterRowComponent"
```

---

### Task 6: `HomeRouteFiltersComponent` — container (search box, toggle, 7 filtri, CTA, PostHog)

**Files:**
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filters.component.ts`
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filters.component.html`
- Create: `projects/wm-core/src/home/home-route-filters/home-route-filters.component.scss`
- Modify: `projects/wm-core/src/wm-core.module.ts`

**Interfaces:**
- Consumes: `wm-home-route-filter-row` (Task 5); `confMAPLayers` (esistente, `conf.selector.ts`); `routeFiltersChanged`, `routeFilters` (Task 3); `RouteFilterState`, `RouteFilterKey`, `hasActiveFilters`, `singleValueOptions`, `listValueOptions`, `numericBucketOptions`, `STAGE_COUNT_BUCKETS`, `DISTANCE_BUCKETS` (Task 2); `wm-searchbar` (esistente)
- Produces: componente `wm-home-route-filters` — consumato dal Task 7 in `home.component.html`

- [ ] **Step 1: Creare il componente**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filters.component.ts`:

```typescript
import {ChangeDetectionStrategy, Component, Inject, Optional, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {ILAYER} from '@wm-core/types/config';
import {confMAPLayers} from '@wm-core/store/conf/conf.selector';
import {routeFilters} from '@wm-core/store/user-activity/user-activity.selector';
import {routeFiltersChanged} from '@wm-core/store/user-activity/user-activity.action';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {Language} from '@wm-types/language';
import {
  DISTANCE_BUCKETS,
  FilterOption,
  hasActiveFilters,
  listValueOptions,
  numericBucketOptions,
  RouteFilterKey,
  RouteFilterState,
  singleValueOptions,
  STAGE_COUNT_BUCKETS,
} from './home-route-filters.utils';

interface RouteFilterOptionsByKey {
  distance: FilterOption[];
  stageCount: FilterOption[];
  shape: FilterOption[];
  walkingNetwork: FilterOption[];
  regions: FilterOption[];
  themes: FilterOption[];
  seasons: FilterOption[];
}

/**
 * Componente "Cerca il tuo cammino" (oc:8414): search box esistente + toggle + 7 filtri ad
 * accordion che filtrano client-side, in tempo reale, la lista dei cammini mostrata in Home.
 * Generico — la visibilità è decisa dal chiamante (`home.component.html`, tramite
 * `confShowRouteFilters`), questo componente non si nasconde da sé per evitare di duplicare quel
 * gate anche qui.
 */
@Component({
  standalone: false,
  selector: 'wm-home-route-filters',
  templateUrl: './home-route-filters.component.html',
  styleUrls: ['./home-route-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HomeRouteFiltersComponent {
  /** Chiave del filtro attualmente espanso, o `null` se tutti chiusi (apertura esclusiva). */
  openKey: RouteFilterKey | null = null;
  /** Selezione corrente, dispatchata allo store ad ogni variazione (aggiornamento live della lista). */
  draft: RouteFilterState = {};
  /** `true` se il pannello dei 7 filtri è visibile (toggle a icona cursori). */
  panelOpen = false;

  options$: Observable<RouteFilterOptionsByKey> = this._store.select(confMAPLayers).pipe(
    map((layers: ILAYER[]) => this._deriveOptions(layers ?? [])),
  );

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    this._store.select(routeFilters).subscribe(filters => {
      this.draft = filters ?? {};
    });
  }

  get hasActiveFilters(): boolean {
    return hasActiveFilters(this.draft);
  }

  /** Apre/chiude il pannello dei 7 filtri (icona cursori accanto alla search box). */
  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  /**
   * Espande/collassa la riga `key` (apertura esclusiva: aprirne una chiude l'eventuale altra aperta).
   * @param key Chiave del filtro alternato.
   */
  toggleRow(key: RouteFilterKey): void {
    this.openKey = this.openKey === key ? null : key;
  }

  /** Chiude la riga attualmente aperta ("Fatto") senza modificare la selezione. */
  closeRow(): void {
    this.openKey = null;
  }

  /**
   * Aggiorna la selezione di `key` e la dispatcha subito allo store — la lista Home si aggiorna
   * live, come richiesto dal ticket ("al variare dei filtri").
   * @param key Chiave del filtro modificato.
   * @param values Nuova selezione per quel filtro.
   */
  onSelectionChange(key: RouteFilterKey, values: string[]): void {
    this.draft = {...this.draft, [key]: values};
    this._store.dispatch(routeFiltersChanged({filters: this.draft}));
    this._posthogClient?.capture('filterUsed', {
      filter_type: 'route',
      filter_id: key,
      filter_values: values.join(','),
    });
  }

  /** CTA "Andiamo!": i filtri sono già applicati live, qui si limita a collassare il pannello. */
  applyFilters(): void {
    this.panelOpen = false;
  }

  /** "Azzera filtri": svuota la selezione e la dispatcha allo store. */
  resetFilters(): void {
    this.draft = {};
    this._store.dispatch(routeFiltersChanged({filters: {}}));
  }

  private _deriveOptions(layers: ILAYER[]): RouteFilterOptionsByKey {
    const lang = (this._langSvc.currentLang as Language) ?? 'it';
    return {
      distance: numericBucketOptions(layers, 'distance', DISTANCE_BUCKETS),
      stageCount: numericBucketOptions(layers, 'stage_count', STAGE_COUNT_BUCKETS),
      shape: singleValueOptions(layers, 'shape', lang, ['discontinuous']),
      walkingNetwork: singleValueOptions(layers, 'walking_network', lang),
      regions: listValueOptions(layers, 'taxonomy_where', lang),
      themes: listValueOptions(layers, 'themes', lang),
      seasons: listValueOptions(layers, 'season', lang),
    };
  }
}
```

- [ ] **Step 2: Creare il template**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filters.component.html`:

```html
<div class="wm-home-route-filters">
  <div class="wm-home-route-filters-search-row">
    <wm-searchbar [initSearch]="''"></wm-searchbar>
    <button
      type="button"
      class="wm-home-route-filters-toggle"
      [attr.aria-expanded]="panelOpen"
      [attr.aria-label]="'Filtri' | wmtrans"
      (click)="togglePanel()"
    >
      <ion-icon name="options-outline"></ion-icon>
    </button>
  </div>

  <ng-container *ngIf="panelOpen">
    <ng-container *ngIf="options$|async as options">
      <wm-home-route-filter-row
        [label]="'Lunghezza'|wmtrans"
        [options]="options.distance"
        [selected]="draft.distance ?? []"
        [open]="openKey === 'distance'"
        (toggleEVT)="toggleRow('distance')"
        (selectionChangeEVT)="onSelectionChange('distance', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="5" x2="5" y2="19"></line>
          <circle cx="6.5" cy="6.5" r="2.5"></circle>
          <circle cx="17.5" cy="17.5" r="2.5"></circle>
        </svg>
      </wm-home-route-filter-row>

      <wm-home-route-filter-row
        [label]="'Tappe'|wmtrans"
        [options]="options.stageCount"
        [selected]="draft.stageCount ?? []"
        [open]="openKey === 'stageCount'"
        (toggleEVT)="toggleRow('stageCount')"
        (selectionChangeEVT)="onSelectionChange('stageCount', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </wm-home-route-filter-row>

      <wm-home-route-filter-row
        [label]="'Tipologia'|wmtrans"
        [options]="options.shape"
        [selected]="draft.shape ?? []"
        [open]="openKey === 'shape'"
        (toggleEVT)="toggleRow('shape')"
        (selectionChangeEVT)="onSelectionChange('shape', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </wm-home-route-filter-row>

      <wm-home-route-filter-row
        [label]="'Portata'|wmtrans"
        [options]="options.walkingNetwork"
        [selected]="draft.walkingNetwork ?? []"
        [open]="openKey === 'walkingNetwork'"
        (toggleEVT)="toggleRow('walkingNetwork')"
        (selectionChangeEVT)="onSelectionChange('walkingNetwork', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      </wm-home-route-filter-row>

      <wm-home-route-filter-row
        [label]="'Regioni'|wmtrans"
        [options]="options.regions"
        [selected]="draft.regions ?? []"
        [open]="openKey === 'regions'"
        (toggleEVT)="toggleRow('regions')"
        (selectionChangeEVT)="onSelectionChange('regions', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </wm-home-route-filter-row>

      <wm-home-route-filter-row
        [label]="'Temi'|wmtrans"
        [options]="options.themes"
        [selected]="draft.themes ?? []"
        [open]="openKey === 'themes'"
        (toggleEVT)="toggleRow('themes')"
        (selectionChangeEVT)="onSelectionChange('themes', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 6.2 19 5M17.8 11.8 19 13M4.2 6.2 3 5M4.2 11.8 3 13"></path>
          <path d="M4 17l5.5-5.5"></path>
          <path d="M13 21l1-1"></path>
        </svg>
      </wm-home-route-filter-row>

      <wm-home-route-filter-row
        [label]="'Stagioni'|wmtrans"
        [options]="options.seasons"
        [selected]="draft.seasons ?? []"
        [open]="openKey === 'seasons'"
        (toggleEVT)="toggleRow('seasons')"
        (selectionChangeEVT)="onSelectionChange('seasons', $event)"
        (doneEVT)="closeRow()"
      >
        <svg filter-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </wm-home-route-filter-row>
    </ng-container>

    <div class="wm-home-route-filters-actions">
      <ion-button class="wm-home-route-filters-cta" (click)="applyFilters()">
        {{ 'Andiamo!' | wmtrans }}
        <ion-icon name="arrow-forward" slot="end"></ion-icon>
      </ion-button>
      <ion-button
        *ngIf="hasActiveFilters"
        class="wm-home-route-filters-reset"
        fill="outline"
        (click)="resetFilters()"
      >
        {{ 'Azzera filtri' | wmtrans }}
        <ion-icon name="close-circle-outline" slot="end"></ion-icon>
      </ion-button>
    </div>
  </ng-container>
</div>
```

- [ ] **Step 3: Creare lo stile**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home-route-filters/home-route-filters.component.scss`:

```scss
.wm-home-route-filters {
  padding: 12px;
  background: var(--wm-color-white, #fff);
  border-radius: 12px;
}

.wm-home-route-filters-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  wm-searchbar {
    flex: 1;
  }
}

.wm-home-route-filters-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: var(--wm-color-primary, #ff6600);
  color: var(--wm-color-primary-contrast, #fff);
  font-size: 1.2em;
  cursor: pointer;
}

.wm-home-route-filters-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.wm-home-route-filters-cta {
  flex: 1;
}

.wm-home-route-filters-reset {
  flex: 1;
}
```

- [ ] **Step 4: Registrare il componente in `wm-core.module.ts`**

In `core/src/app/shared/wm-core/projects/wm-core/src/wm-core.module.ts`:

1. Aggiungere l'import (accanto a quello di `HomeRouteFilterRowComponent` dal Task 5):

```typescript
import {HomeRouteFiltersComponent} from './home/home-route-filters/home-route-filters.component';
```

2. Aggiungere `HomeRouteFiltersComponent` all'array `declarations`.

- [ ] **Step 5: Verificare che il progetto compili**

Run: `cd core && npx tsc --noEmit`

Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home-route-filters/home-route-filters.component.ts \
        projects/wm-core/src/home/home-route-filters/home-route-filters.component.html \
        projects/wm-core/src/home/home-route-filters/home-route-filters.component.scss \
        projects/wm-core/src/wm-core.module.ts
git commit -m "feat(oc:8414): add HomeRouteFiltersComponent container"
```

---

### Task 7: Wiring in `home.component.html`/`.ts`

**Files:**
- Modify: `projects/wm-core/src/home/home.component.ts`
- Modify: `projects/wm-core/src/home/home.component.html`

**Interfaces:**
- Consumes: `confShowRouteFilters` (Task 3); `wm-home-route-filters` (Task 6); `currentEcLayer$` (già esistente in `home.component.ts`, riga 70)

- [ ] **Step 1: Aggiungere l'observable di visibilità**

In `core/src/app/shared/wm-core/projects/wm-core/src/home/home.component.ts`:

1. Aggiungere `confShowRouteFilters` all'import esistente da `@wm-core/store/conf/conf.selector` (riga 15-21):

```typescript
import {
  confAPP,
  confHOME,
  confPROJECT,
  confOPTIONS,
  confMAP,
  confShowRouteFilters,
} from '@wm-core/store/conf/conf.selector';
```

2. Aggiungere la property, accanto a `confMAP$` (riga 64):

```typescript
  confShowRouteFilters$: Observable<boolean> = this._store.select(confShowRouteFilters);
```

- [ ] **Step 2: Aggiornare il template**

In `core/src/app/shared/wm-core/projects/wm-core/src/home/home.component.html`, sostituire il blocco `<wm-searchbar ...></wm-searchbar>` esistente (righe 11-16) con:

```html
  <wm-searchbar
    *ngIf="!(confShowRouteFilters$|async) && (confMAP$|async)?.hitMapUrl==null &&(confOPTIONS$|async)?.show_searchbar && !(ugcOpened$|async) && (online$|async)"
    #searchCmp
    [initSearch]="''"
  >
  </wm-searchbar>
  <wm-home-route-filters
    *ngIf="(confShowRouteFilters$|async) && !(currentEcLayer$|async)"
  ></wm-home-route-filters>
```

Nota: `currentEcLayer$` è già una property esistente di `WmHomeComponent` (riga 70) — nessuna aggiunta necessaria per quella parte. Quando un layer è selezionato, il nuovo componente si nasconde interamente (search box inclusa, dato che la renderizza internamente) — coerente con la decisione presa in reverse-interaction: la ricerca sulle tappe del layer selezionato è un comportamento già esistente e gestito altrove (`wm-home-layer`/`wm-config-detail`), non da questo componente.

- [ ] **Step 3: Verificare che il progetto compili**

Run: `cd core && npx tsc --noEmit`

Expected: nessun errore.

- [ ] **Step 4: Verifica manuale nel browser**

Run: `npm start`, aprire l'app, verificare:
- Su uno shard/config SENZA `attributes` sui layer: la Home mostra la `wm-searchbar` esattamente come oggi, nessuna traccia del nuovo componente.
- Con dati locali che hanno `attributes` (vedi backend locale, già fixato durante la pianificazione — verificare `http://127.0.0.1:8000/api/app/webmapp/1/config.json` restituisca `attributes`): la Home mostra il nuovo componente al posto della search box standalone; aprire un cammino dal risultato filtrato e verificare che il pannello filtri sparisca mentre il layer è aperto.

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home.component.ts \
        projects/wm-core/src/home/home.component.html
git commit -m "feat(oc:8414): wire HomeRouteFiltersComponent into home page"
```

---

### Task 8: Traduzioni

**Files:**
- Modify: `projects/wm-core/src/localization/i18n/it.ts`
- Modify: `projects/wm-core/src/localization/i18n/en.ts`
- Modify: `projects/wm-core/src/localization/i18n/de.ts`
- Modify: `projects/wm-core/src/localization/i18n/es.ts`
- Modify: `projects/wm-core/src/localization/i18n/fr.ts`
- Modify: `projects/wm-core/src/localization/i18n/pr.ts`
- Modify: `projects/wm-core/src/localization/i18n/sq.ts`

**Interfaces:**
- Consumes: nessuna — chiavi lette a runtime dal pipe `wmtrans` già usato nei template dei Task 5/6
- Produces: chiavi `'Lunghezza'`, `'Tappe'`, `'Tipologia'`, `'Portata'`, `'Regioni'`, `'Temi'`, `'Stagioni'`, `'Fatto'`, `'Andiamo!'`, `'Azzera filtri'`, `'tappe'`, `'km'`

- [ ] **Step 1: Aggiungere le chiavi a `it.ts` (lingua di default)**

In `core/src/app/shared/wm-core/projects/wm-core/src/localization/i18n/it.ts`, dentro l'oggetto `wmIT`, aggiungere (la chiave `'distance'` esiste già a riga 20 — non duplicarla, le nuove chiavi sotto sono per il componente filtri, testo distinto dal box "Distanza" della traccia):

```typescript
  'Lunghezza': 'Lunghezza',
  'Tappe': 'Tappe',
  'Tipologia': 'Tipologia',
  'Portata': 'Portata',
  'Regioni': 'Regioni',
  'Temi': 'Temi',
  'Stagioni': 'Stagioni',
  'Fatto': 'Fatto',
  'Andiamo!': 'Andiamo!',
  'Azzera filtri': 'Azzera filtri',
```

- [ ] **Step 2: Aggiungere le traduzioni a `en.ts`**

Aprire `core/src/app/shared/wm-core/projects/wm-core/src/localization/i18n/en.ts` e verificare il nome dell'oggetto esportato (segue lo stesso pattern di `it.ts`, es. `wmEN`). Aggiungere le stesse chiavi con valore inglese:

```typescript
  'Lunghezza': 'Length',
  'Tappe': 'Stages',
  'Tipologia': 'Type',
  'Portata': 'Network',
  'Regioni': 'Regions',
  'Temi': 'Themes',
  'Stagioni': 'Seasons',
  'Fatto': 'Done',
  'Andiamo!': "Let's go!",
  'Azzera filtri': 'Clear filters',
```

- [ ] **Step 3: Aggiungere le traduzioni a `de.ts`**

Stesso pattern, valore tedesco:

```typescript
  'Lunghezza': 'Länge',
  'Tappe': 'Etappen',
  'Tipologia': 'Typ',
  'Portata': 'Netz',
  'Regioni': 'Regionen',
  'Temi': 'Themen',
  'Stagioni': 'Jahreszeiten',
  'Fatto': 'Fertig',
  'Andiamo!': 'Los geht\'s!',
  'Azzera filtri': 'Filter zurücksetzen',
```

- [ ] **Step 4: Aggiungere le traduzioni a `es.ts`**

Stesso pattern, valore spagnolo:

```typescript
  'Lunghezza': 'Longitud',
  'Tappe': 'Etapas',
  'Tipologia': 'Tipología',
  'Portata': 'Red',
  'Regioni': 'Regiones',
  'Temi': 'Temas',
  'Stagioni': 'Estaciones',
  'Fatto': 'Hecho',
  'Andiamo!': '¡Vamos!',
  'Azzera filtri': 'Borrar filtros',
```

- [ ] **Step 5: Aggiungere le traduzioni a `fr.ts`**

Stesso pattern, valore francese:

```typescript
  'Lunghezza': 'Longueur',
  'Tappe': 'Étapes',
  'Tipologia': 'Typologie',
  'Portata': 'Réseau',
  'Regioni': 'Régions',
  'Temi': 'Thèmes',
  'Stagioni': 'Saisons',
  'Fatto': 'Terminé',
  'Andiamo!': 'Allons-y!',
  'Azzera filtri': 'Effacer les filtres',
```

- [ ] **Step 6: Aggiungere le traduzioni a `pr.ts`**

Stesso pattern (codice lingua `pr`, usato in questo repo per il portoghese — refuso preesistente non corretto in questo ciclo, vedi overview di `wm-types`, sezione Out of scope):

```typescript
  'Lunghezza': 'Comprimento',
  'Tappe': 'Etapas',
  'Tipologia': 'Tipologia',
  'Portata': 'Rede',
  'Regioni': 'Regiões',
  'Temi': 'Temas',
  'Stagioni': 'Estações',
  'Fatto': 'Concluído',
  'Andiamo!': 'Vamos!',
  'Azzera filtri': 'Limpar filtros',
```

- [ ] **Step 7: Aggiungere le traduzioni a `sq.ts`**

Stesso pattern, valore albanese:

```typescript
  'Lunghezza': 'Gjatësia',
  'Tappe': 'Etapa',
  'Tipologia': 'Lloji',
  'Portata': 'Rrjeti',
  'Regioni': 'Rajonet',
  'Temi': 'Temat',
  'Stagioni': 'Stinët',
  'Fatto': 'U krye',
  'Andiamo!': 'Shkojmë!',
  'Azzera filtri': 'Pastro filtrat',
```

- [ ] **Step 8: Verificare che il progetto compili**

Run: `cd core && npx tsc --noEmit`

Expected: nessun errore (i file `i18n/*.ts` sono oggetti letterali, un errore di sintassi qui bloccherebbe l'intera build).

- [ ] **Step 9: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/localization/i18n/it.ts \
        projects/wm-core/src/localization/i18n/en.ts \
        projects/wm-core/src/localization/i18n/de.ts \
        projects/wm-core/src/localization/i18n/es.ts \
        projects/wm-core/src/localization/i18n/fr.ts \
        projects/wm-core/src/localization/i18n/pr.ts \
        projects/wm-core/src/localization/i18n/sq.ts
git commit -m "feat(oc:8414): add translations for route filters component"
```

---

### Task 9: Test E2E Cypress (repo principale `webmapp-app`)

> **Nota sulla posizione di questo task:** a differenza di tutti i task precedenti (repo `wm-core`), i test Cypress di questo progetto vivono nel repo principale `webmapp-app` (`core/cypress/e2e/`), non nel submodule — stesso pattern già usato per `config-detail-boxes.cy.ts` (oc:8181) e `ugc-segnalazione-layer-selection.cy.ts` (oc:7639). Questo task va eseguito nel checkout di `webmapp-app`, non in quello di `wm-core`. La deviazione dal domain-mapping originale (che non aveva anticipato questo file) va registrata in `notes.md` di entrambi i repo.

**Files:**
- Create: `core/cypress/e2e/app_52/route-filters.cy.ts` (in `webmapp-app`, non in `wm-core`)
- Create: `core/cypress/fixtures/conf-route-filters.json` (in `webmapp-app`, copia di una fixture `conf-*.json` esistente con `MAP.layers[*].attributes` aggiunto su almeno due layer)

**Interfaces:**
- Consumes: pattern `setupIntercepts`/`visitWithPrivacy`/`waitForApp` documentato nel CLAUDE.md di `wm-core` (`cy.intercept()` con fixture, mai API reali)

- [ ] **Step 1: Preparare la fixture**

Individuare una fixture `conf-*.json` esistente in `core/cypress/fixtures/` (repo `webmapp-app`) già usata da un altro test Cypress di Home (es. quella usata da `config-detail-boxes.cy.ts`). Copiarla in `core/cypress/fixtures/conf-route-filters.json` e, nel file copiato, aggiungere manualmente a **due** oggetti in `MAP.layers` (scegliendone due con `id` già referenziato da un box `box_type: "layer"` in `HOME`) un campo `attributes`:

```json
"attributes": {
  "distance": 68.3,
  "stage_count": 8,
  "shape": {"value": "roundtrip", "name": {"it": "Anello", "en": "Roundtrip"}},
  "taxonomy_where": [{"value": "tuscany", "name": {"it": "Toscana", "en": "Tuscany"}}],
  "walking_network": {"value": "nwn", "name": {"it": "Nazionale", "en": "National"}},
  "season": [{"value": "autumn", "name": {"it": "Autunno", "en": "Autumn"}}]
}
```

Sul secondo layer, usare valori diversi (es. `"shape": {"value": "linear", ...}`, `"stage_count": 3`, regione diversa) — necessario per verificare che il filtro escluda effettivamente uno dei due e non l'altro.

- [ ] **Step 2: Scrivere il test**

Creare `core/cypress/e2e/app_52/route-filters.cy.ts`:

```typescript
const CONF_URL = '**/config.json';
const ELASTIC_URL = '**/api/v2/elasticsearch*';

const setupIntercepts = () => {
  cy.intercept('GET', CONF_URL, {fixture: 'conf-route-filters.json'}).as('conf');
  cy.intercept('GET', ELASTIC_URL, {fixture: 'elastic-init'}).as('elastic');
};

const visitWithPrivacy = (url: string) => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('privacy-accepted', 'true');
    },
  });
};

describe('Home — filtri sui cammini (oc:8414)', () => {
  beforeEach(() => {
    setupIntercepts();
    visitWithPrivacy('/');
    cy.wait('@conf');
  });

  it('mostra il componente filtri quando almeno un layer ha attributes', () => {
    cy.get('wm-home-route-filters').should('exist');
    cy.get('wm-searchbar').should('have.length', 1); // solo quella dentro il nuovo componente
  });

  it('filtra la lista dei cammini selezionando un valore Tipologia', () => {
    cy.get('.wm-home-route-filters-toggle').click();
    cy.contains('wm-home-route-filter-row', 'Tipologia').find('button').first().click();
    cy.contains('wm-home-route-filter-row', 'Tipologia')
      .contains('.wm-home-route-filter-option', 'Anello')
      .find('input[type="checkbox"]')
      .check({force: true});
    cy.get('wm-home-landing wm-layer-box').should('have.length', 1);
  });

  it('"Azzera filtri" ripristina la lista completa', () => {
    cy.get('.wm-home-route-filters-toggle').click();
    cy.contains('wm-home-route-filter-row', 'Tipologia').find('button').first().click();
    cy.contains('wm-home-route-filter-row', 'Tipologia')
      .contains('.wm-home-route-filter-option', 'Anello')
      .find('input[type="checkbox"]')
      .check({force: true});
    cy.contains('button', 'Azzera filtri').click();
    cy.get('wm-home-landing wm-layer-box').should('have.length', 2);
  });
});
```

- [ ] **Step 3: Eseguire il test in locale**

Run (dalla root di `webmapp-app`): `cd core && npx cypress run --spec 'cypress/e2e/app_52/route-filters.cy.ts'`

Expected: 3 test verdi. Se il selettore `.wm-home-route-filters-toggle` o la struttura DOM non combaciano esattamente con l'implementazione dei Task 5/6/7, aggiustare i selettori del test per riflettere il markup realmente reso (non modificare il comportamento applicativo per far passare il test).

- [ ] **Step 4: Commit**

```bash
# Nel checkout di webmapp-app (repo principale, non wm-core)
git add core/cypress/e2e/app_52/route-filters.cy.ts core/cypress/fixtures/conf-route-filters.json
git commit -m "test(oc:8414): add Cypress E2E coverage for home route filters"
```

---

## Self-Review

**Spec coverage:**
- Tipi `LayerAttributes`/`ILAYER.attributes` → Task 1 (+ plan.md wm-types)
- Derivazione opzioni dinamiche, bucket fissi, esclusione `discontinuous`, predicato AND/OR → Task 2
- Aggiornamento live della lista Home, integrazione con la ricerca testuale esistente → Task 3 + Task 4
- 7 filtri accordion, icone, "Fatto" → Task 5 + Task 6
- Search box integrata, toggle, "Andiamo!"/"Azzera filtri", PostHog, gating sui dati, nascondersi quando un layer è selezionato → Task 6 + Task 7
- Traduzioni in tutte le lingue → Task 8
- Test E2E con fixture → Task 9

**Placeholder scan:** nessun TBD; tutte le icone SVG, le soglie dei bucket, le traduzioni e il codice dei selettori/reducer/componenti sono scritte per intero, non descritte.

**Type consistency:** `RouteFilterState`/`RouteFilterKey`/`FilterOption`/`NumericBucket` sono definiti una sola volta in `home-route-filters.utils.ts` (Task 2) e riusati senza ridefinizioni in Task 3 (azione/selettori), Task 5 (riga) e Task 6 (container) — stessi nomi di campo (`distance`, `stageCount`, `shape`, `walkingNetwork`, `regions`, `themes`, `seasons`) ovunque.

**Nota per l'esecutore:** il Task 9 crea un file nel repo `webmapp-app` (principale), non nel submodule `wm-core` — verificare di essere nel checkout corretto prima del commit di quel task. Registrare questa correzione al domain-mapping in `notes.md`.
