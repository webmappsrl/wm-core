> Ticket: oc:8998

# Tassonomie del dettaglio traccia in forma v1 — piano di implementazione

> **Per chi esegue:** sub-skill richiesta: `superpowers:subagent-driven-development` (consigliata)
> oppure `superpowers:executing-plans`. Gli step usano le checkbox (`- [ ]`).
> **Nessun commit automatico**: gli step «Commit» sono istruzioni per il dev, da eseguire solo
> dopo la sua approvazione nel review-gate.

**Obiettivo:** il dettaglio traccia arriva allo store sempre in forma v1 (`properties.taxonomies`),
qualunque versione del file `tracks/<id>.json` sia stata scaricata o salvata offline.

**Architettura:** la entry dello shard dichiara la versione del file (`trackVersion`).
`EcService` costruisce l'URL in base a quella e passa ogni traccia, da rete o da localForage, a un
adapter puro che restituisce `{track, icons}`. L'effect del dettaglio registra le icone nello store
con un'action che fa merge. I componenti leggono solo `taxonomies`.

**Stack:** Angular 20, NgRx 20, Karma + Jasmine, localForage.

**Spec:** `wm-core/docs/features/8998-tassonomie-del-dettaglio-traccia-in-forma-v1/overview.md` e
`wm-types/docs/features/8998-tassonomie-del-dettaglio-traccia-in-forma-v1/overview.md`.

## Vincoli globali

- Identificatori in inglese; commenti, descrizioni dei test e documentazione in italiano.
- Commit con scope del ticket: `feat(oc:8998): …`, `refactor(oc:8998): …`, `test(oc:8998): …`.
- Branch `feature/oc-8998-tassonomie-del-dettaglio-traccia-in-forma-v1` in `wm-webapp`, `wm-core` e
  `wm-types`.
- `wm-types` contiene solo tipi e costanti, niente logica. I tipi non hanno il prefisso `I`.
- La localizzazione di un campo si scrive `Partial<Record<Language, string>>`.
- La versione **si dichiara** (entry dello shard, campo salvato con la copia offline), non si deduce
  dal contenuto del file.
- Nessun ripiego sul file senza versione quando `tracks/v1/<id>.json` risponde 404.
- L'adapter agisce solo sul primo livello di `properties` della traccia: `related_pois` invariati.
- Test di `wm-core`: da `src/app/shared/wm-core/`,
  `nvm use 22 && CI=true npx ng test wm-core --configuration=ci`.
  Build di `wm-types`: da `src/app/shared/wm-types/`, `npm run build`.

## Punti da guardare in review

1. **Traccia v1 con `where` senza `admin_level`** (in `769.json`: `Area T (Centrale)`, `ZNUT7`):
   `wm-txn-where` deve scartarli come oggi, non mostrarli in una riga vuota. → Task 6, test.
2. **Copia offline salvata prima del ticket** (nessun `trackVersion`, chiavi vecchie): esce v1. →
   Task 4, test.
3. **`icons.json` che arriva dopo la traccia** con lo stesso nome di un'icona inline: vince
   `icons.json`. → Task 3, test.
4. **Elemento `activity` con `icon_name: null`** (`mtb` in `769.json`): resta valido, nessuna icona
   registrata. → Task 2, test.
5. **Traccia senza nessuna tassonomia** (né `taxonomies` né `taxonomy`): l'adapter non lancia e
   produce `taxonomies: {}`. → Task 2, test.

---

### Task 1: tipi in `wm-types`

**File:**
- Crea: `wm-types/src/taxonomy.ts`
- Modifica: `wm-types/src/index.ts` (export), `wm-types/src/environment.ts` (`Shard`, `forestasdev`),
  `wm-types/src/feature.ts` (`WmProperties`)

**Interfacce prodotte:**

```ts
// taxonomy.ts
export type TrackVersion = 'v1';
export const CURRENT_TRACK_VERSION: TrackVersion = 'v1';
export interface TaxonomyItem {
  identifier: string;
  name: Partial<Record<Language, string>>;
  icon_name?: string | null;
  admin_level?: number;
}
export interface Taxonomies {
  activity?: TaxonomyItem[];
  where?: TaxonomyItem[];
  [type: string]: TaxonomyItem[] | undefined; // route-type, hiking-difficulty, …
}
```

`TaxonomyItem` è chiuso: nessuna index signature. `Shard` riceve `readonly trackVersion?: TrackVersion;`.
`WmProperties` riceve `taxonomies?: Taxonomies;`. `taxonomy_where` resta (lo usano POI e UGC).

- [ ] **Step 1:** scrivi `taxonomy.ts` con le interfacce sopra ed esportalo da `index.ts`.
- [ ] **Step 2:** aggiungi `trackVersion` a `Shard` e `trackVersion: 'v1'` alla entry `forestasdev`;
      nessun'altra entry cambia.
- [ ] **Step 3:** aggiungi `taxonomies?: Taxonomies` a `WmProperties`.
- [ ] **Step 4:** verifica. Da `src/app/shared/wm-types/`: `npm run build` → nessun errore.
- [ ] **Step 5: commit** (in `wm-types`):
      `feat(oc:8998): tipo di taxonomies e versione del file traccia nella entry dello shard`

---

### Task 2: adapter puro e fixture

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-lingue-null-nel-name)

**File:**
- Crea: `wm-core/projects/wm-core/src/utils/track-v1-adapter.ts`
- Crea: `wm-core/projects/wm-core/src/utils/track-v1-adapter.spec.ts`
- Crea: `wm-core/projects/wm-core/src/utils/fixtures/track-v1-adapter/` con `README.md` e tre JSON:
  `forestasdev-769-v1.json`, `forestasdev-769-unversioned.json`, `geohub-100-unversioned.json`

**Fixture.** Ridotte a `type`, `geometry` (primi due punti) e queste `properties`: `id`, `name`,
`taxonomies`, `taxonomy`, `taxonomy_where`, `taxonomyWheres`, `related_pois` (solo il primo). Per
GeoHub tieni in `taxonomy.activity[0].icon` l'SVG vero. Fonti:
`https://forestas.dev.maphub.it/wmfe/forestasdev/tracks/v1/769.json`,
`https://forestas.dev.maphub.it/wmfe/forestasdev/tracks/769.json`,
`https://wmfe.s3.eu-central-1.amazonaws.com/geohub/tracks/100.json`. Il `README.md` dice fonte e
data di cattura.

**Interfacce prodotte:**

```ts
export interface AdaptedTrack {
  track: WmFeature<LineString>;
  icons: ICONS; // icon_name → svg, vuoto se nessun SVG inline
}
export function adaptTrackToV1(
  track: WmFeature<LineString> | null,
  version: TrackVersion | null | undefined,
): AdaptedTrack | null;
```

Regola, da implementare così:
- `track == null` → `null`.
- `version === 'v1'` → `{track, icons: {}}`, stesso oggetto.
- altrimenti: nuova feature con `properties` copiate; `taxonomies` = `properties.taxonomies` se
  presente, altrimenti `{activity}` costruito da `properties.taxonomy?.activity` (per elemento:
  `identifier`, `name`, `icon_name` se c'è; nient'altro); se non c'è nemmeno quello,
  `taxonomies: {}`. `where` non si costruisce mai dalle chiavi vecchie. Per ogni elemento di
  `taxonomy.activity` con `icon` stringa non vuota: nome = `icon_name` ?? `txn-<identifier>`,
  l'elemento v1 porta quel nome, `icons[nome] = icon`. Poi si cancellano `taxonomy`,
  `taxonomy_where`, `taxonomyWheres`. L'input non viene mutato.

- [ ] **Step 1: test che falliscono**, in `track-v1-adapter.spec.ts`:
  - `'una traccia v1 esce invariata e senza icone'` — `forestasdev-769-v1` con `'v1'`:
    `result.track` è `toBe` l'input, `result.icons` è `{}`.
  - `'una traccia di shard senza versione tiene taxonomies e perde le chiavi vecchie'` —
    `forestasdev-769-unversioned` con `undefined`: `properties.taxonomies` `toEqual` quella della
    fixture v1; `taxonomy`, `taxonomy_where`, `taxonomyWheres` sono `undefined`.
  - `'una traccia GeoHub costruisce activity e nessun where'` — `geohub-100-unversioned` con
    `undefined`: `taxonomies.activity` `toEqual`
    `[{identifier: 'hiking', name: {it: 'Escursionismo', en: 'Hiking', sq: null}, icon_name: 'txn-hiking'}]`
    (`name` copiato com'è); `taxonomies.where` `undefined`; le tre chiavi vecchie `undefined`.
  - `'gli SVG inline di GeoHub diventano icone'` — stessa fixture: `Object.keys(icons)` è
    `['txn-hiking']` e `icons['txn-hiking']` è l'SVG della fixture.
  - `'un elemento senza icon_name con SVG usa txn-<identifier>'` — fixture GeoHub modificata nel
    test togliendo `icon_name`: chiave `txn-hiking`, e l'elemento v1 ha `icon_name: 'txn-hiking'`.
  - `'un elemento con icon_name null resta valido'` — `forestasdev-769-unversioned`: l'elemento `mtb`
    ha `icon_name: null`, `icons` è `{}`.
  - `'una traccia senza tassonomie produce taxonomies vuota'` — feature minima con solo `id`:
    `taxonomies` `toEqual({})`.
  - `'i related_pois restano come arrivano'` — `forestasdev-769-v1` e `-unversioned`:
    `related_pois[0].properties.taxonomy` è ancora definita.
  - `'è idempotente'` — l'uscita della fixture GeoHub ripassata con `undefined` dà `track`
    `toEqual` alla prima uscita e `icons` `{}`.
  - `'non muta l'input'` — `JSON.stringify` della fixture prima e dopo è uguale.
  - `'null resta null'`.
- [ ] **Step 2:** lancia i test di wm-core → falliscono (`adaptTrackToV1` non esiste).
- [ ] **Step 3:** implementa `adaptTrackToV1` in `track-v1-adapter.ts` secondo la regola sopra.
- [ ] **Step 4:** lancia i test di wm-core → passano.
- [ ] **Step 5: commit** (in `wm-core`): `feat(oc:8998): adapter della traccia alla forma v1`

---

### Task 3: store delle icone con merge e precedenza di `icons.json`

**File:**
- Modifica: `wm-core/projects/wm-core/src/store/icons/icons.actions.ts`, `icons.reducer.ts`
- Crea: `wm-core/projects/wm-core/src/store/icons/icons.reducer.spec.ts`

**Interfacce prodotte:**
`export const addIcons = createAction('[conf] Add Icons', props<{icons: ICONS}>());`

Reducer:
- `addIcons`: `icons = {...icons, ...(state.icons ?? {})}`: un nome già presente non si sovrascrive.
- `loadIconsSuccess`: `icons = {...(state.icons ?? {}), ...icons}`: `icons.json` vince.

- [ ] **Step 1: test che falliscono:**
  - `'addIcons su stato vuoto registra le icone'`.
  - `'addIcons non sovrascrive un nome già caricato da icons.json'` — `loadIconsSuccess({icons: {a: 'json'}})`
    poi `addIcons({icons: {a: 'inline', b: 'inline'}})` → `{a: 'json', b: 'inline'}`.
  - `'icons.json arrivato dopo sovrascrive l'icona inline'` — `addIcons({icons: {a: 'inline'}})` poi
    `loadIconsSuccess({icons: {a: 'json'}})` → `{a: 'json'}`.
  - `'loadIconsSuccess non cancella le icone inline con nome diverso'` — `addIcons({b})` poi
    `loadIconsSuccess({a})` → contiene `a` e `b`.
- [ ] **Step 2:** lancia i test → falliscono.
- [ ] **Step 3:** aggiungi `addIcons` e modifica il reducer come sopra.
- [ ] **Step 4:** lancia i test → passano.
- [ ] **Step 5: commit** (in `wm-core`): `feat(oc:8998): icone aggiunte allo store con precedenza di icons.json`

---

### Task 4: URL versionato, adapter in `getEcTrack`, copia offline in v1

**File:**
- Modifica: `wm-core/projects/wm-core/src/services/environment.service.ts` (getter)
- Modifica: `wm-core/projects/wm-core/src/store/features/ec/ec.service.ts:45-100`
- Modifica: `wm-core/projects/wm-core/src/utils/localForage.ts:127` (`getEcTrack`) e `:484` (`saveEcTrack`)
- Test: `wm-core/projects/wm-core/src/store/features/ec/ec.service.spec.ts`

**Interfacce consumate:** `adaptTrackToV1`, `AdaptedTrack` (Task 2); `TrackVersion`,
`CURRENT_TRACK_VERSION` (Task 1).

**Interfacce prodotte:**
- `EnvironmentService.trackVersion: TrackVersion | null` — dallo shard corrente, `null` se assente.
- `EcService.getEcTrackWithIcons(id: string | number): Observable<AdaptedTrack>` — fa quello che
  oggi fa `getEcTrack`, ma emette ogni traccia, da cache e da rete, passata da `adaptTrackToV1`.
  URL: `${awsApi}/tracks/v1/${id}.json` se `trackVersion === 'v1'`, altrimenti quello di oggi.
  Versione passata all'adapter: per la rete `trackVersion` dello shard, per la cache il
  `trackVersion` salvato con la copia (assente → `undefined`).
- `EcService.getEcTrack(id)` resta con la firma di oggi:
  `getEcTrackWithIcons(id).pipe(map(r => r?.track ?? null))`. Il diario
  (`diaries/active-route.service.ts:242`) non cambia.
- `saveEcTrack` salva la copia come `{...track, trackVersion: CURRENT_TRACK_VERSION, properties: {…}}`.
  L'aggiornamento della copia in `getEcTrack` passa a `saveEcTrack` la traccia **già adattata**.
- `localForage.getEcTrack` restituisce `(WmFeature<LineString> & {trackVersion?: TrackVersion}) | null`.

- [ ] **Step 1: test che falliscono**, in `ec.service.spec.ts`, con lo stesso setup dei test
      esistenti (`HttpTestingController`, spy su localForage):
  - `'con lo shard in v1 scarica tracks/v1/<id>.json'` — `trackVersion` `'v1'`: `expectOne`
    sull'URL `…/tracks/v1/769.json`.
  - `'senza dichiarazione scarica tracks/<id>.json'`.
  - `'la risposta senza versione esce in forma v1'` — flush di `geohub-100-unversioned`: la
    traccia emessa non ha `taxonomy` e ha `taxonomies.activity`.
  - `'una copia offline senza trackVersion viene normalizzata anche con lo shard in v1'` —
    cache = `forestasdev-769-unversioned` senza `trackVersion`, shard `'v1'`: la prima emissione
    non ha `taxonomy_where`.
  - `'aggiornando la copia salva la traccia adattata'` — cache presente, flush di GeoHub:
    `saveEcTrack` chiamato con una traccia senza `taxonomy`.
  - `'getEcTrack emette solo la traccia'` — l'emissione non ha la proprietà `icons`.
  - `'un 404 su v1 non riprova sul file senza versione'` — flush 404 su `…/v1/…`, senza cache:
    errore emesso e `httpMock.verify()` senza altre richieste.
- [ ] **Step 2:** lancia i test → falliscono.
- [ ] **Step 3:** implementa getter, `getEcTrackWithIcons`, `getEcTrack` che lo usa,
      `saveEcTrack` e `localForage.getEcTrack` come sopra. La chiave `${url}-last-modified` resta
      basata sull'URL effettivo.
- [ ] **Step 4:** lancia i test, compresi i due esistenti di `ec.service.spec.ts` → passano.
- [ ] **Step 5: commit** (in `wm-core`): `feat(oc:8998): dettaglio traccia versionato e normalizzato all'ingresso`

---

### Task 5: l'effect del dettaglio registra le icone

**File:**
- Modifica: `wm-core/projects/wm-core/src/store/features/ec/ec.effects.ts` (`currentEcTrack$`)
- Test: `wm-core/projects/wm-core/src/store/features/ec/ec.effects.spec.ts`

**Interfacce consumate:** `getEcTrackWithIcons` (Task 4), `addIcons` (Task 3).

`currentEcTrack$` usa `getEcTrackWithIcons`. Per ogni emissione: se `icons` non è vuoto emette
`addIcons({icons})` **prima** di `loadCurrentEcTrackSuccess({ecTrack})`;
`decorateNotAccessibleRelatedPoi` resta sulla traccia come oggi.

- [ ] **Step 1: test che falliscono**, nuovo `describe('EcEffects - currentEcTrack$ (oc:8998)')`:
  - `'con icone inline emette addIcons e poi loadCurrentEcTrackSuccess'`.
  - `'senza icone emette solo loadCurrentEcTrackSuccess'`.
- [ ] **Step 2:** lancia i test → falliscono.
- [ ] **Step 3:** modifica `currentEcTrack$` (`switchMap` → `from([...actions])` per emissione).
- [ ] **Step 4:** lancia i test → passano.
- [ ] **Step 5: commit** (in `wm-core`): `feat(oc:8998): icone inline della traccia registrate dall'effect del dettaglio`

---

### Task 6: componenti del dettaglio traccia su `taxonomies`

**File:**
- Modifica: `wm-core/projects/wm-core/src/track-properties/track-properties.component.html:44-51`
- Modifica: `wm-core/projects/wm-core/src/tab-howto/tab-howto.component.html`
- Modifica: `wm-core/projects/wm-core/src/taxonomy-where/taxonomy-where.component.ts`
- Crea: `wm-core/projects/wm-core/src/taxonomy-where/taxonomy-where.component.spec.ts`

**Interfacce consumate:** `TaxonomyItem`, `Taxonomies` (Task 1).

`wm-txn-where` è usato anche da POI, UGC e `poi-popup` della webapp con la mappa
`taxonomy_where`: l'input `taxonomyWheres` resta. Si aggiunge
`wheres = input<TaxonomyItem[] | null | undefined>(null)`; `_normalizedWhere` usa `wheres()` se non
vuoto (livello da `admin_level`, label da `name`), altrimenti la mappa come oggi.

- `track-properties`:
  `<wm-txn-where *ngIf="ecTrackProperties?.taxonomies?.where?.length" [wheres]="ecTrackProperties.taxonomies.where">`
  e `<wm-tab-howto *ngIf="ecTrackProperties?.taxonomies?.activity?.length" …>`.
- `tab-howto`: legge `properties.taxonomies?.activity`; `wm-icon` riceve l'elemento (ha `icon_name`).
  `hasIcon` resta, e con il solo `icon_name` funziona già.

- [ ] **Step 1: test che falliscono**, in `taxonomy-where.component.spec.ts`:
  - `'con wheres raggruppa per admin_level'` — gli elementi `where` di `forestasdev-769-v1`:
    `regionWheres()` ha label `{en: 'Sardegna'}`, `provinceWheres()` `{en: 'Nuoro'}`,
    `municipalityWheres()` `{en: 'Fonni'}`.
  - `'gli elementi senza admin_level sono scartati'` — `Area T (Centrale)` e `ZNUT7` non
    compaiono; `hasWhereInfo()` è `true`.
  - `'con la sola mappa taxonomyWheres funziona come oggi'` — la `taxonomy_where` di
    `forestasdev-769-unversioned` dà gli stessi tre livelli.
- [ ] **Step 2:** lancia i test → falliscono.
- [ ] **Step 3:** aggiungi `wheres` al componente e modifica i due template.
- [ ] **Step 4:** lancia i test → passano. `grep -rn "taxonomy_where\|taxonomy?.activity\|taxonomy.activity\|taxonomyWheres" track-properties tab-howto`
      → nessun risultato.
- [ ] **Step 5: commit** (in `wm-core`): `refactor(oc:8998): il dettaglio traccia legge solo taxonomies`

---

### Task 7: cancellare `wmgetdata`

**File:**
- Elimina: `wm-core/projects/wm-core/src/pipes/wm-get-data.pipe.ts`
- Modifica: `wm-core/projects/wm-core/src/pipes/pipe.module.ts` (import e dichiarazione)

- [ ] **Step 1:** `grep -rn "wmgetdata\|WmGetDataPipe" src/app` in `wm-webapp` e in
      `../webmapp-app/core/src` → solo il pipe e `pipe.module.ts`.
- [ ] **Step 2:** cancella il file e togli import, `declarations` ed `exports` in `pipe.module.ts`.
- [ ] **Step 3:** lancia i test di wm-core → passano; da `wm-webapp`, `npm run build` → nessun errore.
- [ ] **Step 4: commit** (in `wm-core`): `refactor(oc:8998): rimosso il pipe wmgetdata inutilizzato`

---

### Task 8: verifica nel prodotto e puntatori

- [ ] **Step 1:** da `wm-webapp`, `CHROME_HEADLESS=1 ng test --configuration=ci` → passano.
- [ ] **Step 2:** da `wm-webapp`, `npm start` sullo shard `forestasdev`: dettaglio della traccia 769.
      Network: richiesta a `…/tracks/v1/769.json`; pagina: attività (4) e luoghi (Sardegna, Nuoro,
      Fonni) come prima del ticket.
- [ ] **Step 3:** stesso controllo su uno shard senza dichiarazione: richiesta a `tracks/<id>.json`,
      attività e luoghi invariati.
- [ ] **Step 4:** stesso controllo su una traccia GeoHub: attività con icona, nessun luogo (come oggi).
- [ ] **Step 5:** su una traccia scaricata offline prima del ticket (o simulata salvando in
      localForage `forestasdev-769-unversioned` senza `trackVersion`): con la rete disattivata il
      dettaglio mostra attività e luoghi.
- [ ] **Step 6: commit** (in `wm-webapp`, commit separato per i puntatori, stessa PR):
      `chore(oc:8998): aggiornati i puntatori di wm-core e wm-types`
