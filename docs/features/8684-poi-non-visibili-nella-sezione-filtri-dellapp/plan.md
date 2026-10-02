> Ticket: oc:8684

# POI non visibili nella sezione "Filtri": piano di implementazione

> **Per chi esegue:** sotto-skill richiesta `superpowers:subagent-driven-development` (consigliata)
> oppure `superpowers:executing-plans`. Gli step usano le checkbox (`- [ ]`).
>
> **Nessun commit, `git add` o branch in autonomia.** I commit indicati sono istruzioni testuali per
> il dev, eseguiti solo dopo la sua approvazione esplicita.

**Obiettivo:** con una track aperta, il pannello "Filtri" → "Punti di interesse" propone le tipologie
dei POI della track; aprire una track o un POI azzera il solo testo di ricerca, che la X della track
ripristina.

**Architettura:** due selettori dedicati al pannello in `ec.selector.ts` scelgono la fonte (POI
della track o POI globali). La regola sul testo di ricerca vive tutta in `UrlHandlerService`:
azzeramento in `updateURL()`, normalizzazione e riconoscimento del ripristino in `initialize()`,
ripristino in un metodo nuovo `closeTrack()`. Il ripristino arriva fino a PostHog con un flag
sull'azione `inputTyped`.

**Stack:** Angular 20, NgRx 20, Ionic 8, Karma + Jasmine.

**Spec:** [overview.md](overview.md); per la parte E2E,
`wm-webapp/docs/features/8684-poi-non-visibili-nella-sezione-filtri-dellapp/overview.md`.

## Vincoli globali

- Tutti i percorsi sono relativi a `projects/wm-core/src/` del submodule `wm-core`.
- Test: da `src/app/shared/wm-core/` del prodotto,
  `nvm use 22 && CI=true npx ng test wm-core --configuration=ci`. Non girano nella CI di `wm-core`.
- `ecPois`, `countEcPois` e `countPois` **non si toccano**.
- Formato delle tipologie ricavate: `poi_type_<identifier>`, come in
  `map-core/src/directives/track.related-pois.directive.ts:347-351`.
- La regola su `search` vale per `track` e `poi`, non per `ugc_track` e `ugc_poi`.
- Identificatori in inglese; commenti, descrizioni dei test e commit in italiano.
- Ogni spec nuovo chiama `TestBed.resetTestingModule()` in `beforeEach` e in `afterEach`, se usa il
  TestBed (`.claude/rules/spec-e-testbed.md`).
- Commit: `fix(oc:8684): …`.

## Punti da controllare in review

1. **Indietro del browser dalla track alla lista dei risultati:** l'URL torna con `search`, la
   lista torna, e su PostHog non parte `searchPerformed`. Coperto da un test nel Task 4.
2. **Aprire un POI collegato dalla track** (`ec_related_poi`) non è un'apertura di `poi`: la copia
   salvata resta, e la X della track ripristina comunque. Coperto da un test nel Task 3.
3. **POI della track con `taxonomyIdentifiers` già valorizzato**: si usa quello, senza aggiungere
   `poi_type_…`. Coperto da un test nel Task 1.
4. **UGC aperto**: il contatore della sezione resta `countUgcPois`, come oggi. Coperto da un test
   nel Task 1.
5. **`search` codificato nell'URL** (`rotta%20dei%20due%20mari`): la copia salvata è il testo
   decodificato, e il ripristino non lo codifica due volte. Coperto da un test nel Task 3.

---

### Task 1: Selettori del pannello dai POI della track

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-selettori-del-pannello-dai-poi-della-track)

**File:**
- Modifica: `store/features/ec/utils.ts` (nuova funzione accanto a `buildStats`)
- Modifica: `store/features/ec/ec.selector.ts:166-173` (`poisStats`) e un selettore nuovo
- Modifica: `store/features/features.selector.ts` (selettore nuovo)
- Modifica: `filters/filters.component.ts:57` (`countPois$`)
- Test: `store/features/ec/utils.spec.ts`, nuovo `store/features/ec/ec.selector.spec.ts`

**Interfacce:**
- Produce: `withPoiTypeIdentifiers(pois: WmFeature<Point>[]): WmFeature<Point>[]` in `utils.ts`
- Produce: `poisStats` (stessa firma di oggi) in `ec.selector.ts`
- Produce: `poisFiltersPanelCount: MemoizedSelector<object, number>` in
  `store/features/features.selector.ts`

- [ ] **Step 1: test di `withPoiTypeIdentifiers` in `utils.spec.ts`**

  - `'ricava poi_type_<identifier> se taxonomyIdentifiers manca'`: un POI con
    `taxonomy.poi_type.identifier: 'accomodation'` e senza `taxonomyIdentifiers` →
    `taxonomyIdentifiers` uguale a `['poi_type_accomodation']`.
  - `'lascia taxonomyIdentifiers se è già valorizzato'`: `['poi_type_camping', 'theme_x']` resta
    identico.
  - `'non aggiunge nulla se manca anche poi_type'`: `taxonomyIdentifiers` resta assente o `[]`.
  - `'non modifica il POI in ingresso'`: l'oggetto originale resta senza `taxonomyIdentifiers`.

- [ ] **Step 2: eseguire i test e verificare che falliscano** (`withPoiTypeIdentifiers` non esiste)

- [ ] **Step 3: implementare `withPoiTypeIdentifiers` in `utils.ts`**

  Restituisce copie dei POI (`{...f, properties: {...f.properties, taxonomyIdentifiers}}`) solo
  dove serve. Commento in italiano che rimanda alla copia della stessa regola in `map-core`.

- [ ] **Step 4: test dei selettori in `ec.selector.spec.ts`, con `.projector`**

  `poisStats` riceve in più `currentEcTrack` (o `currentEcRelatedPois`), `poiFilterIdentifiers` e
  `inputTyped`, oltre alle statistiche globali di oggi.
  - `'con una track aperta conta i POI della track'`: 3 POI collegati, due `accomodation` e uno
    `catering`, senza `taxonomyIdentifiers`. Il risultato è
    `{poi_type_accomodation: 2, poi_type_catering: 1}`, indipendentemente dai POI globali.
  - `'con una track aperta senza related_pois la sezione è vuota'`: `related_pois` assente → `{}`.
    Lo stesso con `[]`.
  - `'con una track aperta applica le tipologie selezionate'`: filtro `['poi_type_catering']` →
    `{poi_type_catering: 1}`.
  - `'senza track restituisce le statistiche globali di oggi'`: l'input globale passa invariato.
  - `poisFiltersPanelCount`: con una track aperta e un filtro `['poi_type_accomodation']` → `2`;
    senza track → il valore di `countEcPois`; con UGC aperto → il valore di `countUgcPois`.

- [ ] **Step 5: eseguire i test e verificare che falliscano**

- [ ] **Step 6: implementare i selettori**

  Con una track aperta, la catena per i POI della track è questa: `withPoiTypeIdentifiers` →
  `filterFeatures(…, poiFilterIdentifiers)` → `filterFeaturesByInputTyped(…, inputTyped)` →
  `buildStats` (per `poisStats`) o `.length` (per `poisFiltersPanelCount`).

  Il ramo senza track resta identico a oggi. Lo stage "where" (`filterTaxonomies`) non si applica
  ai POI della track. "Track aperta" vuol dire `currentEcTrack != null`.

  `poisFiltersPanelCount` rispetta `ugcOpened` come `countPois` (`features.selector.ts:33`), e per
  evitare un import circolare vive in `features.selector.ts`. In `filters.component.ts:57`,
  `countPois$` passa a `this._store.select(poisFiltersPanelCount)`.

- [ ] **Step 7: eseguire i test e verificare che passino**

- [ ] **Step 8: commit**, solo dopo l'approvazione del dev

  `fix(oc:8684): il pannello filtri conta i POI della track aperta`

---

### Task 2: Voce selezionata visibile a 0

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-voce-selezionata-visibile-a-0)

**File:**
- Modifica: `filters/select-filter/select-filter.component.html:15`
- Test: `filters/select-filter/select-filter.component.spec.ts` (nuovo) oppure un test sulla
  condizione estratta in un metodo

**Interfacce:**
- Produce: `isPoiOptionVisible(identifier: string, stats: {[id: string]: number}, selected: string[]): boolean`
  su `SelectFilterComponent`

- [ ] **Step 1: test di `isPoiOptionVisible`**, costruendo il componente con `new` come da
  `.claude/rules/spec-e-testbed.md`
  - conteggio presente → `true`;
  - conteggio assente e voce non selezionata → `false`;
  - conteggio assente e voce selezionata → `true`.
- [ ] **Step 2: eseguire i test e verificare che falliscano**
- [ ] **Step 3: implementare il metodo e usarlo nel template al posto di
  `poisStats[option.identifier]!= null`.** Il conteggio mostrato (`wmhowmany`) resta com'è: per una
  voce senza conteggio deve mostrare `0`. Se non lo fa, il template mostra `0` esplicitamente.
- [ ] **Step 4: eseguire i test e verificare che passino**
- [ ] **Step 5: commit**, solo dopo l'approvazione del dev

  `fix(oc:8684): le tipologie selezionate restano visibili anche a zero`

---

### Task 3: Azzeramento, normalizzazione e ripristino della ricerca

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3-azzeramento-normalizzazione-e-ripristino-della-ricerca)

**File:**
- Modifica: `services/url-handler.service.ts` (`updateURL`, `initialize`, `navigateTo`, campi
  privati, nuovo `closeTrack`)
- Modifica: `track-properties/track-properties.component.ts:52-54`
- Test: `services/url-handler.service.spec.ts`

**Interfacce:**
- Produce: `closeTrack(): void`, `_lastReadParams` (usato dal Task 4) e
  `navigateTo(routes?: string[], queryParams?: Params, extras?: {replaceUrl?: boolean}): void`

Stato privato del service: `_savedSearch: string | null` (la copia per la X) e `_lastReadParams:
Params` (gli ultimi parametri letti da `initialize`, diversi da `_currentQueryParams$`, che
`navigateTo` aggiorna già prima della navigazione).

- [ ] **Step 1: test in `url-handler.service.spec.ts`**

  Il setup esistente va bene. Per i test di `updateURL`, si imposta lo stato corrente con
  `service['_currentQueryParams$'].next({...})` e si verifica la chiamata a `navigateTo`.
  - `'aprire una track toglie search e lo salva'`: corrente `{search: 'due mari'}`,
    `updateURL({track: 183})` → `navigateTo` chiamato con params senza `search` (`undefined`).
    `service['_savedSearch']` è `'due mari'`.
  - `'aprire un poi toglie search'`: lo stesso con `{poi: 5}`.
  - `'aprire un ugc_track non tocca search'`: con `{ugc_track: 1}`, `search` resta.
  - `'aprire un poi senza search non sovrascrive la copia'`: `_savedSearch = 'due mari'`, corrente
    senza `search`, `updateURL({poi: 5})` → `_savedSearch` resta `'due mari'`.
  - `'aprire un related poi non tocca la copia'`: `updateURL({ec_related_poi: 7})` con track aperta
    → `_savedSearch` invariata.
  - `'un link con track e search viene normalizzato'`: `queryParams$.next({track: '183', search:
    'rotta%20dei%20due%20mari'})`, poi `tick(100)` in `fakeAsync`. `navigateTo` è chiamato senza
    `search` e con `{replaceUrl: true}`, `_savedSearch` è `'rotta dei due mari'`, e nessun
    `inputTyped` con quel testo è stato dispatchato.
  - `'la copia si cancella quando la track non è più nell\'URL'`: `_savedSearch = 'x'`, poi si
    leggono parametri senza `track` → `_savedSearch` è `null`.
  - `'passare a un\'altra tappa conserva la copia'`: si leggono `{track: '183'}`, poi
    `{track: '184'}` → `_savedSearch` invariata.
  - `'closeTrack ripristina la copia e la cancella'`: `_savedSearch = 'due mari'`, corrente
    `{track: '183'}`, `closeTrack()` → `navigateTo` con `track: undefined` e
    `search: 'due mari'`, poi `_savedSearch` è `null`.
  - `'closeTrack senza copia si comporta come oggi'`: params passati a `navigateTo` senza la chiave
    `search` aggiunta.
- [ ] **Step 2: eseguire i test e verificare che falliscano**
- [ ] **Step 3: implementare in `url-handler.service.ts`**
  - `updateURL`: dopo aver calcolato `newParams` e applicato `excluseField`, se `queryParams.track`
    o `queryParams.poi` è non nullo e `newParams.search` è non vuoto, salva il testo decodificato in
    `_savedSearch` e mette `newParams.search = undefined`. Se `search` è vuoto, `_savedSearch`
    non si tocca.
  - `initialize`: subito dopo `this._currentQueryParams$.next(params)`:
    - se `params.track`/`params.poi` e `params.search` ci sono insieme, salva la copia, chiama
      `navigateTo` senza `search` con `{replaceUrl: true}` e fa `return`: i dispatch partono alla
      lettura successiva;
    - se `params.track == null`, mette `_savedSearch = null`.
    - In fondo al blocco, `_lastReadParams = params`.
  - `navigateTo`: il terzo argomento opzionale `extras` si passa a `_router.navigate` (`replaceUrl`).
  - `closeTrack()`: legge e azzera `_savedSearch`, poi `updateURL({track: undefined})` più
    `search: <copia>` solo se la copia c'è.
- [ ] **Step 4: in `track-properties.component.ts:52-54`, `close()` chiama
  `this._urlHandlerSvc.closeTrack()`**
- [ ] **Step 5: eseguire i test e verificare che passino**, compresi quelli già presenti nello
  spec
- [ ] **Step 6: commit**, solo dopo l'approvazione del dev

  `fix(oc:8684): aprire una track o un poi azzera la ricerca, la X la ripristina`

---

### Task 4: Ricerca ripristinata esclusa da PostHog

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-4-ricerca-ripristinata-esclusa-da-posthog)

**File:**
- Modifica: `store/user-activity/user-activity.action.ts:19-22` (`inputTyped`)
- Modifica: `store/user-activity/user-activity.reducer.ts:150-156` e lo stato (`:56`, `:99`)
- Modifica: `store/user-activity/user-activity.selector.ts` (selettore nuovo)
- Modifica: `store/user-activity/user-activity.effects.ts:184-206` (`triggerQueryOnInput$`)
- Modifica: `store/features/ec/ec.actions.ts:7-16` (`ecTracks`) ed `ec.effects.ts:86`
- Modifica: `services/url-handler.service.ts:98` (dispatch con `restored`)
- Test: `services/url-handler.service.spec.ts`; per l'effect, uno spec nuovo
  `store/features/ec/ec.effects.spec.ts` oppure un test sulla condizione estratta

**Interfacce:**
- Produce: `inputTyped` con props `{inputTyped: string | null; restored?: boolean}`
- Produce: `inputTypedRestored: MemoizedSelector<object, boolean>`
- Produce: `ecTracks` con la prop in più `skipSearchTracking?: boolean`

- [ ] **Step 1: test**
  - url-handler, `'una ricerca che ricompare dopo una track è marcata restored'`: si leggono
    `{track: '183'}`, poi `{search: 'due mari'}` → dispatch di
    `inputTyped({inputTyped: 'due mari', restored: true})`.
  - url-handler, `'una ricerca normale non è marcata restored'`: si leggono `{}`, poi
    `{search: 'due mari'}` → `restored: false`.
  - effect PostHog, `'non registra searchPerformed se skipSearchTracking'`: `ecTracks` con
    `inputTyped: 'due mari'` e `skipSearchTracking: true` → `capture` non chiamato. Senza il flag
    → chiamato con `'searchPerformed'`.
- [ ] **Step 2: eseguire i test e verificare che falliscano**
- [ ] **Step 3: implementare**
  - `restored` è vero quando nei parametri appena letti c'è un `search` diverso da quello di
    `_lastReadParams`, e `_lastReadParams` aveva `track` o `poi`. Copre sia la X sia l'indietro
    del browser.
  - Il reducer salva `inputTypedRestored: restored ?? false`; il valore iniziale è `false`.
  - `triggerQueryOnInput$` legge `inputTypedRestored` (`withLatestFrom`) e passa
    `skipSearchTracking` a `ecTracks`.
  - `ec.effects.ts:86`: `if (action.inputTyped && !action.skipSearchTracking && this._posthogClient)`.
- [ ] **Step 4: eseguire i test e verificare che passino**
- [ ] **Step 5: commit**, solo dopo l'approvazione del dev

  `fix(oc:8684): la ricerca ripristinata non conta come ricerca su PostHog`

---

### Task 5: Pagina di conoscenza

**File:**
- Modifica: `docs/knowledge/filtri-poi.md` (alla radice del submodule)

- [ ] **Step 1: riscrivere `## Come funziona oggi`** con la fonte dei conteggi quando una track è
  aperta, la regola su `search`, la copia salvata e la voce selezionata visibile a 0. Le voci nuove
  in `## Perché così` portano oc:8684. Il caso del layer 50 va fra i comportamenti attesi: il
  pannello è vuoto perché il file dei POI globali non li contiene.
- [ ] **Step 2: commit insieme alle note**, solo dopo l'approvazione del dev

  `docs(oc:8684): filtro dei POI con una track aperta`

---

## Dopo il merge in `wm-core`

Il piano di `wm-webapp`
(`docs/features/8684-poi-non-visibili-nella-sezione-filtri-dellapp/plan.md`) aggiunge il test
Cypress e aggiorna il puntatore del submodule.
