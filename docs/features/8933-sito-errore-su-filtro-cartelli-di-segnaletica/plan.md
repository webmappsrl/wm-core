> Ticket: oc:8933

# Tab POI con filtro tipologia POI — piano di implementazione

> **Per chi esegue:** sub-skill `superpowers:executing-plans`, task per task. I passi usano le
> checkbox (`- [x]`). **Nessun commit né branch automatico**: i commit qui sotto sono istruzioni
> per il dev, che li esegue dopo il review-gate di `wm-plan`.

**Obiettivo:** con soli filtri POI attivi la home mostra il tab POI, mai un tab nascosto ma
selezionato; se non c'è nessun POI da mostrare compare il messaggio vuoto, senza una barra dei
tab senza pulsanti e senza messaggi falsi durante il caricamento.

**Architettura:** la scelta del tab e la visibilità del pulsante Tracks diventano una funzione
pura, `homeResultTab`, accanto a `homeResultEmptyState`. Il componente la chiama dentro il
`combineLatest` e il template legge il risultato. Un indicatore `ecPoisLoaded` nello store `ec`
permette allo stato vuoto di aspettare i POI.

**Stack:** Angular 20, Ionic 8, NgRx 20, Karma + Jasmine.

**Spec:** [overview.md](overview.md)

## Vincoli globali

- Tutto il codice in `wm-core`. In `wm-webapp` e `webmapp-app` cambia solo il puntatore al
  submodule, che non entra nei commit.
- Nessun testo nuovo: si usa il messaggio esistente
  `'Spiacenti non ci sono risultati con questi criteri di ricerca.'` (`HOME_RESULT_EMPTY_MESSAGES.generic`).
- Identificatori in inglese, commenti e descrizioni dei test in italiano.
- Restano invariati: la precedenza dei filtri Home oc:8414, il layer aperto, le UGC aperte, i
  filtri misti track + POI (default Tracks).
- `lastFilterType` resta nello store: si toglie solo da `home-result.component.ts`.
- Branch: `feature/oc-8933-sito-errore-su-filtro-cartelli-di-segnaletica` in `wm-core`.
- Test: da `wm-core`, `nvm use 22 && CI=true npx ng test wm-core --configuration=ci`.

## Focus della review

1. **Il tab scelto dall'utente con il pulsante sparito**: Tracks cliccato, poi filtro solo POI →
   POI; filtro tolto → di nuovo Tracks. Coperto in Task 1.
2. **Filtro POI + ricerca che trova solo cammini** → tab layers, nessun messaggio vuoto. Coperto in
   Task 1 e Task 3.
3. **POI non ancora caricati** con filtro POI attivo → nessun messaggio. Coperto in Task 3.
4. **Caricamento dei POI fallito** → l'indicatore diventa comunque vero, altrimenti il messaggio
   non comparirebbe mai. Coperto in Task 2.
5. **Pulsante Tracks del template e funzione in disaccordo**: il template deve leggere
   `tracksTabVisible`, non ricalcolare la condizione. Verificato nella prova manuale del Task 4.

---

### Task 0: Branch

- [x] In `wm-core`, rinominare il branch locale esistente (che contiene solo lo stash del primo
      tentativo, non il codice):
      `git branch -m fix/oc-8933-tab-poi-con-filtro-poi-type feature/oc-8933-sito-errore-su-filtro-cartelli-di-segnaletica`,
      partendo da `develop` aggiornato (`93f508a`). Lo stash resta dov'è e non va applicato.

### Task 1: funzione pura `homeResultTab`

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-funzione-pura-homeresulttab)

**File:**
- Crea: `projects/wm-core/src/home/home-result/home-result-tab.ts`
- Test: `projects/wm-core/src/home/home-result/home-result-tab.spec.ts`

**Interfacce prodotte:**

```ts
export interface HomeResultTabInput {
  countTracks: number;
  countPois: number;
  countLayers: number;
  /** Tab cliccato dall'utente (homeResultTabSelected), o null. */
  userSelectedTab: HomeResultTab;
  /** Selettore showTracks: false con soli filtri POI, senza layer né UGC aperti. */
  showTracks: boolean;
  hasCurrentLayer: boolean;
  hasActiveRouteFilters: boolean;
}
export interface HomeResultTabResult {
  tab: HomeResultTab;
  /** Il pulsante Tracks è visibile: il template lo legge invece di ricalcolarlo. */
  tracksTabVisible: boolean;
}
export function homeResultTab(input: HomeResultTabInput): HomeResultTabResult;
```

`HomeResultTab` viene da `@wm-types/user-activity`.

- [x] **Passo 1: scrivere lo spec.** Base: `countTracks: 12, countPois: 90, countLayers: 0,
      userSelectedTab: null, showTracks: true, hasCurrentLayer: false, hasActiveRouteFilters: false`.
      Casi (descrizioni in italiano), ciascuno con `tab` e `tracksTabVisible` attesi:
  - nessun filtro → `{tab: 'tracks', tracksTabVisible: true}`
  - soli filtri POI (`showTracks: false`) → `{tab: 'pois', tracksTabVisible: false}` (caso oc:8933)
  - soli filtri POI e utente aveva cliccato Tracks → `'pois'`
  - soli filtri POI, ricerca con cammini (`countLayers: 2`) → `'layers'`
  - soli filtri POI e `countPois: 0` → `{tab: null, tracksTabVisible: false}`
  - filtro rimosso dopo un clic su Tracks (`showTracks: true, userSelectedTab: 'tracks'`) → `'tracks'`
  - utente ha cliccato POI con tracce visibili → `'pois'`
  - layers disponibili e nessuna scelta → `'layers'`; con `hasCurrentLayer: true` → mai `'layers'`
  - filtri Home attivi senza layer aperto: `countLayers: 3` → `{tab: 'layers', tracksTabVisible: false}`;
    `countLayers: 0` → `{tab: null, tracksTabVisible: false}`
  - filtri Home attivi con layer aperto → `{tab: 'tracks', tracksTabVisible: true}`
  - `countTracks: 0` → `tracksTabVisible: false`, tab `'pois'`
- [x] **Passo 2: lanciare i test** e verificare che lo spec fallisca (modulo inesistente).
- [x] **Passo 3: implementare `homeResultTab`** riportando la regola di
      `showResultTabSelected$` (`home-result.component.ts:189-211`) con una sola differenza:
      `tracksAvailable = countTracks > 0 && showTracks`, usato sia nella scelta esplicita sia nel
      default. `tracksTabVisible = tracksAvailable && (!hasActiveRouteFilters || hasCurrentLayer)`.
      In testa un JSDoc che spiega la regola e cita oc:8933 e oc:8765.
- [x] **Passo 4: lanciare i test** e verificare che passino.
- [ ] **Passo 5, commit (istruzione per il dev):**
      `fix(oc:8933): funzione pura per la scelta del tab dei risultati in home`

### Task 2: indicatore `ecPoisLoaded`

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-indicatore-ecpoisloaded)

**File:**
- Modifica: `projects/wm-core/src/store/features/ec/ec.reducer.ts` (interfaccia `Ec`, stato
  iniziale, `on(loadEcPoisSuccess)`, nuovo `on(loadEcPoisFailure)`)
- Modifica: `projects/wm-core/src/store/features/ec/ec.selector.ts`
- Test: `projects/wm-core/src/store/features/ec/ec.reducer.spec.ts` (nuovo)

**Interfacce prodotte:** campo `ecPoisLoaded: boolean` (iniziale `false`); selettore
`export const ecPoisLoaded = createSelector(ec, state => state.ecPoisLoaded);`

- [x] **Passo 1: scrivere lo spec del reducer** (`ecReducer(undefined, {type: '@@init'})`):
  - stato iniziale → `ecPoisLoaded: false`
  - `loadEcPoisSuccess({featureCollection: {type: 'FeatureCollection', features: []}})` → `true`
  - `loadEcPoisFailure()` → `true`
- [x] **Passo 2: lanciare i test** e verificare che falliscano.
- [x] **Passo 3: implementare** campo, stato iniziale, i due `on` e il selettore.
- [x] **Passo 4: lanciare i test.** Devono passare, e il nuovo spec deve comparire nel conteggio
      di Karma (se il totale non sale, lo spec non è stato raccolto).
- [ ] **Passo 5, commit:** `fix(oc:8933): indicatore di POI caricati nello store ec`

### Task 3: stato vuoto con filtro POI senza POI

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3-stato-vuoto-con-filtro-poi-senza-poi)

**File:**
- Modifica: `projects/wm-core/src/home/home-result/home-result-empty-state.ts`
- Test: `projects/wm-core/src/home/home-result/home-result-empty-state.spec.ts`

**Interfacce:** `HomeResultEmptyStateInput` riceve tre campi nuovi: `showTracks: boolean`,
`countPois: number`, `poisLoaded: boolean`. La firma di `homeResultEmptyState` non cambia.

- [x] **Passo 1: aggiornare lo spec.** Aggiungere i tre campi a `base` (`showTracks: true,
      countPois: 0, poisLoaded: true`) e i casi, con `hasActiveRouteFilters: false`:
  - soli filtri POI, `countPois: 0`, `countLayers: 0`, POI caricati, `countAll: 3` → `'generic'`
  - lo stesso con `poisLoaded: false` → `null`
  - lo stesso con `countLayers: 2` → `null` (si vede il tab layers)
  - lo stesso con `countPois: 5` → `null`
  - `showTracks: true`, `countAll: 3` → `null` (invariato)
  - con filtri Home attivi e zero cammini resta `'filters'` (la precedenza non cambia)
- [x] **Passo 2: lanciare i test** e verificare che i nuovi casi falliscano.
- [x] **Passo 3: implementare** la nuova regola dopo quella di `'filters'` e prima di quella
      generica: `!showTracks && poisLoaded && countPois === 0 && countLayers === 0 → 'generic'`.
      Aggiornare il JSDoc.
- [x] **Passo 4: lanciare i test** e verificare che passino.
- [ ] **Passo 5, commit:** `fix(oc:8933): messaggio vuoto con filtro POI e nessun POI`

### Task 4: collegare componente e template

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-4-collegare-componente-e-template)

**File:**
- Modifica: `projects/wm-core/src/home/home-result/home-result.component.ts`
- Modifica: `projects/wm-core/src/home/home-result/home-result.component.html`

**Interfacce consumate:** `homeResultTab` (Task 1), `ecPoisLoaded` (Task 2), i nuovi campi di
`HomeResultEmptyStateInput` (Task 3).

- [x] **Passo 1: componente.**
  - Togliere `lastFilterType$` e l'import di `lastFilterType`.
  - Nuovo `private _homeResultTab$: Observable<HomeResultTabResult>`, costruito con il
    `combineLatest` di oggi in cui `showTracks$` prende il posto di `lastFilterType$`; il `map`
    chiama `homeResultTab({...})`, poi `distinctUntilChanged` su `tab` e `tracksTabVisible`.
  - `showResultTabSelected$ = this._homeResultTab$.pipe(map(r => r.tab), distinctUntilChanged())`.
  - Nuovo `tracksTabVisible$: Observable<boolean>`, ricavato allo stesso modo.
  - `emptyState$`: aggiungere al `combineLatest` `showTracks$`, `countPois$` e
    `this._store.select(ecPoisLoaded)`, e passarli a `homeResultEmptyState`.
  - Estendere il commento oc:8765 sopra `emptyState$`: la regola della visibilità ora sta in
    `homeResultTab` e `homeResultEmptyState`, e il template legge `tracksTabVisible$`.
- [x] **Passo 2: template.**
  - Riga 25: `(emptyState$|async) !== 'filters'` diventa `!(emptyState$|async)`.
  - Pulsante Tracks: l'`*ngIf` diventa `tracks.length > 0 && (tracksTabVisible$|async)`.
- [x] **Passo 3: lanciare tutti i test di `wm-core`** e verificare che passino.
- [x] **Passo 4: controllo dei tipi** da `wm-webapp`:
      `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep home-result` → nessun output. Gli altri
      errori del checkout, che vengono dai tipi del passaporto in `wm-types`, non riguardano
      questo lavoro.
- [x] **Passo 5: prova nel browser.** Da `wm-webapp`, `npm start` in localhost, con uno shard
      che ha filtri POI. Casi da mostrare al dev:
  1. Filtri della mappa → «cartelli di segnaletica», o una tipologia equivalente → tab POI
     selezionato, lista dei POI, nessun pulsante Tracks.
  2. Card `poi_type_filter` della home, se lo shard la ha → tab POI.
  3. Con il filtro attivo, una ricerca testuale che trova solo sentieri → messaggio vuoto, nessuna
     barra dei tab.
  4. Rimozione del filtro → tornano Tracks e i sentieri.
  5. Filtro track + filtro POI insieme → entrambi i pulsanti, default Tracks.
- [ ] **Passo 6, commit:** `fix(oc:8933): la home apre il tab POI con soli filtri POI`

### Task 5: documentazione

**File:** `docs/knowledge/home-ricerca-e-tab.md` (riga 7 e dintorni); `notes.md` di questo
cantiere.

- [x] Aggiornare la regola della scelta del tab: Tracks solo se il suo pulsante è visibile
      (`showTracks`); la regola vive in `homeResultTab`; il nuovo caso dello stato vuoto e
      `ecPoisLoaded`; la scelta scartata (tab impostato nel reducer, deciso in call il 05/11) con il
      motivo. È la fase `update-context` di `wm-plan`.
- [ ] **Commit:** `docs(oc:8933): regola del tab con filtri POI`
