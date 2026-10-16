> Ticket: oc:8763

# Passaporto per singolo cammino — piano app

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tab, badge, anelli e chip del passaporto leggono solo `/api/passport` e compaiono solo
sui cammini accesi; fuori dal dettaglio nessuna chiamata a `/progress`.

**Architecture:** `PassportService.passportRoutes$()` resta l'unica lettura; `visibleProgress` e
`stageIndex$` ne derivano. `passportStamps` e `passportStageChip` (utils pure) applicano la regola
di visibilità.

**Tech Stack:** Angular 20, RxJS, Karma/Jasmine.

**Spec:** [overview.md](overview.md). Backend in `camminiditalia`, tipi in `wm-types` (stesso slug).

## Global Constraints

- Cammino spento = assente da `routes`: nessun timbro, badge, anello, chip.
- Cammino acceso: timbro, badge e anello anche a 0 tappe percorse; chip su ogni sua tappa.
- Nessuna chiamata a `GET /api/layer/{id}/progress` fuori dal dettaglio.
- Stato vuoto (design approvato, variante A: https://claude.ai/artifact/V9Ri4byyXZaUUt8bheYgek):
  titolo «Il passaporto non è ancora attivo» in `var(--ion-color-primary)`; testo «Il servizio
  passaporto non è ancora attivo su nessun cammino. Appena verrà attivato, qui troverai i timbri da
  completare di tutti i cammini in cui è disponibile.» in `$passport-todo-text`; sopra,
  illustrazione in SVG/CSS inline con i colori del passaporto: tre timbri tratteggiati a ventaglio
  (laterali grigi `#d3cfc6` su `$passport-todo-bg`, centrale più grande in `$passport-green` su
  `$passport-green-bg` con icona di impronte), etichetta «PRESTO» in ambra; anello centrale che
  ruota lento e gruppo che oscilla, fermi con `prefers-reduced-motion`. Le tre stringhe (titolo,
  testo, «PRESTO») con chiave = testo italiano in `localization/i18n/{de,en,es,fr,it,pr,sq}.ts`.
- Identificatori in inglese, classi CSS con prefisso `wm-`.
- Test: dipendenze installate in `wm-core` (`npm install --legacy-peer-deps`, Node ≥ 20.19), poi
  `cd core/src/app/shared/wm-core && CI=true npx ng test wm-core --configuration=ci --include=<spec>`.
  **Prima di buildare l'app svuotare `wm-core/node_modules`**, altrimenti `ng build` fallisce con
  `Module not found`.
- Dipende dal piano `wm-types` (Task 1).
- Commit: istruzioni per il dev, mai eseguiti in automatico; scope `feat(oc:8763)`.

## Review Focus

1. Tappa condivisa fra un cammino acceso e uno spento: chip presente — test nel Task 2.
2. Utente non loggato: nessun badge, anello, chip — test nel Task 1 e Task 2.
3. `/api/passport` in errore senza dati precedenti: nessun elemento del passaporto, nessun chip
   «non ancora percorsa» — test nel Task 2.
4. Nuova tappa convalidata su un cammino già iniziato: il chip si aggiorna (nessun
   `distinctUntilChanged` sui soli id dei cammini) — test nel Task 2.
5. Cammino in `routes` ma assente dalla config: nessun timbro — test nel Task 3.

---

### Task 1: `PassportService` legge `validated_tracks`; badge e anello da `routes`

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-e-2-eseguiti-insieme)

**Files:**
- Modify: `passport/passport.service.ts` (`PassportResponse` riga 59, `_toRoutes` riga 580,
  `visibleProgress` riga 322, docblock di `passportRoutes$`)
- Modify: `passport/passport-progress-badge/passport-progress-badge.component.ts:57-58`
- Modify: `passport/passport-logo-ring/passport-logo-ring.directive.ts:38-55`
- Test: `passport/passport.service.spec.ts`, `passport-progress-badge.component.spec.ts`,
  `passport-logo-ring.directive.spec.ts`, fixture in `passport/passport-progress.fixtures.ts` e
  `passport/testing/`

**Interfaces:**
- Consumes: `PassportRoute.validatedTracks` (wm-types).
- Produces: `visibleProgress(layerId: number | null): Observable<PassportRoute | null>` — da
  `passportRoutes$()`, `null` se non loggato, cammino assente o `total === 0`. Badge: `percent`,
  `validated`, `total`; anello: `percent`.

- [ ] **Step 1: Test che falliscono:** `_toRoutes` mappa `validated_tracks` `{"101": "…"}` in
  `validatedTracks` `{101: "…"}` (e `{}` se assente); `visibleProgress` di un cammino in `routes`
  con 0 convalidate emette la route; di un cammino assente emette `null`; **nessuna richiesta HTTP a
  `/api/layer/`** (`HttpTestingController.match(r => r.url.includes('/api/layer/'))` vuoto); badge e
  anello mostrano i valori di una route a 0%.
- [ ] **Step 2:** `--include=projects/wm-core/src/passport/passport.service.spec.ts` (e i due spec
  dei componenti) → FAIL.
- [ ] **Step 3:** implementare; aggiornare i docblock che dicono «cammini con almeno una tappa
  validata».
- [ ] **Step 4:** stessi spec → PASS.
- [ ] **Step 5: Commit (istruzione per il dev)** `feat(oc:8763): badge e anello del passaporto da /api/passport`

### Task 2: `stageIndex$` e chip della tappa sui cammini accesi

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-e-2-eseguiti-insieme)

**Files:**
- Modify: `passport/passport.service.ts` (`stageIndex$` righe 338-365, `_toStageIndex`)
- Modify: `passport/passport.utils.ts:197-218` (`passportStageChip`)
- Modify: `box/search-box/search-box.component.camminiditalia.ts` (solo se cambia l'uso)
- Test: `passport/passport.service.spec.ts`, `passport/passport.utils.spec.ts`

**Interfaces:**
- Consumes: `PassportStageIndex = {completedAt, enabledLayers}` (wm-types).
- Produces: `stageIndex$()` → `{completedAt: unione di tutti i validatedTracks, enabledLayers:
  id dei cammini in routes}`, `null` se `passportRoutes$` emette `null`.
  `passportStageChip(index, trackId, layers)`: `null` se `index` nullo, id non numerico o nessuno
  dei `layers` in `enabledLayers`; `completed` con la data se in `completedAt`; altrimenti
  `not_started`.

- [ ] **Step 1: Test che falliscono** in `passport.utils.spec.ts`: tappa di cammino spento → `null`;
  tappa di cammino acceso non convalidata → `not_started`; convalidata → `completed` con la data;
  tappa con `layers` `[spento, acceso]` → chip presente; `index` nullo → `null`.
  In `passport.service.spec.ts`: `stageIndex$` costruito da una risposta di `/api/passport` senza
  richieste a `/api/layer/`; una seconda risposta con una tappa in più sullo stesso cammino aggiorna
  `completedAt`; `/api/passport` in errore senza dati precedenti → `null`.
- [ ] **Step 2:** spec di service e utils → FAIL.
- [ ] **Step 3:** implementare; togliere `pendingLayers`, il `combineLatest` sulle `progress$` e il
  `distinctUntilChanged` sugli id.
- [ ] **Step 4:** spec di service, utils e `search-box` camminiditalia → PASS.
- [ ] **Step 5: Commit (istruzione per il dev)** `feat(oc:8763): chip delle tappe solo sui cammini col passaporto acceso`

### Task 3: Tab Passaporto — timbri da `routes` e stato vuoto

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3-stato-vuoto)

**Files:**
- Modify: `passport/passport.utils.ts:222-280` (`passportStamps`, `toStamp`)
- Modify: `passport/passport-stamps/passport-stamps.component.{ts,html,scss}`
- Modify: `localization/i18n/{de,en,es,fr,it,pr,sq}.ts`
- Test: `passport/passport.utils.spec.ts`, `passport/passport-stamps/passport-stamps.component.spec.ts`

**Interfaces:**
- Produces: `passportStamps(layers, routes)` → un timbro per ogni layer della config presente in
  `routes`; `status` = `completed` se `route.completed`, `in_progress` se `validated > 0`, altrimenti
  `not_started` con `total` = `route.total`. Ordinamento di oggi invariato. Il VM del componente
  aggiunge `empty: boolean` (`routes.size === 0`).

- [ ] **Step 1: Test che falliscono:** layer della config non in `routes` → nessun timbro; route a 0
  convalidate → timbro `not_started` con `total` della route; route assente dalla config → nessun
  timbro; componente con `routes` vuoto → mostra titolo e testo dello stato vuoto e non la griglia né la
  frase-guida; con cammini ma nessuno iniziato → frase-guida invariata.
- [ ] **Step 2:** spec di utils e stamps → FAIL.
- [ ] **Step 3:** implementare; stato vuoto secondo il design (Global Constraints), blocco centrato
  con classe `wm-passport-stamps-empty` e figli `wm-passport-stamps-empty-*`, SVG `aria-hidden`,
  titolo come `h2`; stringhe nei 7 file i18n (cercare prima che non esistano già).
- [ ] **Step 4:** spec di utils e stamps → PASS; poi tutti gli spec di `projects/wm-core/src/passport/`
  e di `box/search-box/`.
- [ ] **Step 5:** svuotare `wm-core/node_modules`, poi `cd core && npm run build` → build riuscita.
- [ ] **Step 6: Commit (istruzione per il dev)** `feat(oc:8763): tab Passaporto con i soli cammini accesi e stato vuoto`
