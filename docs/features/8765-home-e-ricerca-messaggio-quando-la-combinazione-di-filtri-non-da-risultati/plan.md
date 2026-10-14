> Ticket: oc:8765

# Stato vuoto di `wm-home-result` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `wm-home-result` mostra un unico blocco di stato vuoto — messaggio «cammini» con filtri Home attivi e zero cammini, messaggio generico quando è tutto a zero — invece del pannello bianco.

**Architecture:** una funzione pura decide lo stato (`'filters' | 'generic' | null`); il componente la espone come `emptyState$` e la usa sia per il blocco di stato vuoto sia per nascondere la barra dei tab nel caso `filters`. Il blocco è un contenitore `role="status"` sempre presente, il cui contenuto cambia con `*ngIf`.

**Tech Stack:** Angular 20 (`standalone: false`, `OnPush`, `ViewEncapsulation.None`), Ionic 8 (`IonicModule`, `ion-icon`), NgRx 20, RxJS, Jasmine/Karma (dal consumer).

**Spec:** [overview.md](overview.md)

## Global Constraints

- Tutto il codice in `wm-core`, sotto `projects/wm-core/src/home/home-result/` e `projects/wm-core/src/localization/i18n/`. In `webmapp-app` solo il puntatore del submodule.
- Branch `feature/oc-8765-home-e-ricerca-messaggio-quando-la-combinazione-di-filtri-non-da-risultati` creato da `Passaporto` in **entrambi** i repo; PR verso `Passaporto`.
- Testo nuovo, identico al sito del cliente: `Spiacenti, non ci sono cammini inerenti alla ricerca` (senza punto finale).
- Testo generico invariato: `Spiacenti non ci sono risultati con questi criteri di ricerca.`
- i18n: chiave = testo italiano, ripetuto come valore anche in `it.ts`; 7 file: de, en, es, fr, it, pr, sq.
- Nessun bottone, nessuna azione nello stato vuoto.
- Colori solo da variabili del tema: testo `--wm-color-darkgrey`, icona `--wm-color-medium`. Nessun hex, niente colori di errore.
- Classi nuove con prefisso `wm-`; identificatori in inglese, commenti in italiano; JSDoc sulle funzioni.
- Interfacce senza prefisso `I`.
- Nessun `git commit`/`git push` automatico: i commit sotto sono istruzioni per il dev.

## Review Focus

1. Filtri Home attivi **con un layer aperto** e zero cammini filtrati: niente messaggio «cammini» (i filtri non valgono più) — coperto da spec in Task 1.
2. Filtri attivi + zero cammini **mentre le tracce caricano**: il messaggio «cammini» compare comunque, perché dipende solo dalla configurazione — coperto da spec in Task 1.
3. Barra dei tab vuota sopra il messaggio nel caso del bug (`countAll > 0`, tutti i tab nascosti) — verificata a mano in Task 4.
4. Pannello della mappa (`map.page.html:46` nell'app): il blocco cambia l'altezza del pannello — verificato a mano in Task 4.
5. Lista dei download aperta (`downloadsOpened`): il blocco non deve comparire, perché sta solo nel ramo `noDownload` — verificato a mano in Task 4.

---

### Task 0: Branch

**Files:** nessuno.

- [ ] **Step 1: Controllare lo stato dei due repo.** `git -C <wm-core> status --short` e `git status --short` nell'app. Oggi `wm-core` è su `feature/oc-8761-…` con i file non tracciati di questo cantiere (`docs/features/8765-…/`), e l'app ha modifiche non committate a `core/src/environments/environment.ts` e ai puntatori dei submodule. **Chiedere al dev** cosa farne prima del checkout: non fare stash né scartare nulla d'iniziativa.
- [ ] **Step 2: Creare il branch in `wm-core`**: `git checkout -b feature/oc-8765-home-e-ricerca-messaggio-quando-la-combinazione-di-filtri-non-da-risultati Passaporto`. I file non tracciati del cantiere seguono il checkout.
- [ ] **Step 3: Creare lo stesso branch nell'app** da `Passaporto`, con `git submodule update` per allineare `map-core` e `wm-types` al `Passaporto` (il `wm-core` resta sul branch nuovo).
- [ ] **Step 4: Mostrare al dev i due branch creati** e attendere conferma.

### Task 1: Funzione pura `homeResultEmptyState`

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-lancio-dello-spec)

**Files:**
- Create: `projects/wm-core/src/home/home-result/home-result-empty-state.ts`
- Test: `projects/wm-core/src/home/home-result/home-result-empty-state.spec.ts`

**Interfaces:**
- Produces:
  - `export type HomeResultEmptyState = 'filters' | 'generic' | null;`
  - `export interface HomeResultEmptyStateInput { countAll: number; countLayers: number; hasActiveRouteFilters: boolean; hasCurrentLayer: boolean; tracksLoading: boolean; }`
  - `export function homeResultEmptyState(input: HomeResultEmptyStateInput): HomeResultEmptyState`

- [ ] **Step 1: Scrivere lo spec** (`describe('homeResultEmptyState')`, funzione pura, nessun TestBed). Base: `{countAll: 5, countLayers: 0, hasActiveRouteFilters: true, hasCurrentLayer: false, tracksLoading: false}`.
  - `filtri attivi e zero cammini → 'filters'` (base) — anche con `countAll: 5`, il caso del bug.
  - `filtri attivi, zero cammini, tracce in caricamento → 'filters'` (`tracksLoading: true`).
  - `filtri attivi e un layer aperto → non 'filters'` (`hasCurrentLayer: true`) → `null` con `countAll: 5`; → `'generic'` con `countAll: 0`.
  - `filtri attivi con cammini corrispondenti → null` (`countLayers: 3`).
  - `tutto a zero senza filtri → 'generic'` (`hasActiveRouteFilters: false, countAll: 0`).
  - `tutto a zero in caricamento → null` (come sopra, `tracksLoading: true`).
  - `risultati senza filtri → null` (`hasActiveRouteFilters: false, countAll: 5`).
- [ ] **Step 2: Lanciare lo spec e vederlo fallire.** Gli spec di `wm-core` non girano da soli: si lanciano dall'app, in `core/`:
  `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/wm-core/projects/wm-core/src/home/home-result`
  Se il compilatore segnala il file come «missing from the TypeScript compilation», aggiungere **temporaneamente** `"src/app/shared/wm-core/projects/wm-core/src/home/home-result/**/*.spec.ts"` all'`include` di `core/tsconfig.spec.json`, e toglierlo prima del commit. Atteso: FAIL, modulo non trovato.
- [ ] **Step 3: Implementare `homeResultEmptyState`**, con JSDoc. Regola, in quest'ordine:
  1. `hasActiveRouteFilters && !hasCurrentLayer && countLayers === 0` → `'filters'`
  2. `!tracksLoading && countAll === 0 && countLayers === 0` → `'generic'`
  3. altrimenti `null`
- [ ] **Step 4: Rilanciare lo spec.** Atteso: 7 spec PASS.
- [ ] **Step 5: Commit (istruzione per il dev)** — `feat(oc:8765): funzione pura per lo stato vuoto di home-result`

### Task 2: Chiave i18n

**Files:**
- Modify: `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts` — subito sotto la chiave `'Spiacenti non ci sono risultati con questi criteri di ricerca.'`

- [ ] **Step 1: Verificare che la chiave non esista già**: `git grep -n "non ci sono cammini inerenti" -- projects/wm-core/src/localization` → nessun risultato.
- [ ] **Step 2: Aggiungere la chiave `'Spiacenti, non ci sono cammini inerenti alla ricerca'`** con questi valori:
  - it: `Spiacenti, non ci sono cammini inerenti alla ricerca`
  - en: `Sorry, there are no routes matching your search`
  - de: `Leider gibt es keine Wege, die zu deiner Suche passen`
  - es: `Lo sentimos, no hay caminos que coincidan con tu búsqueda`
  - fr: `Désolé, aucun chemin ne correspond à votre recherche`
  - pr: `Desculpe, não há caminhos correspondentes à sua pesquisa`
  - sq: `Më vjen keq, nuk ka shtigje që përputhen me kërkimin tuaj`
- [ ] **Step 3: Verificare**: `git grep -c "non ci sono cammini inerenti" -- projects/wm-core/src/localization/i18n` → 7 file, 1 occorrenza ciascuno.
- [ ] **Step 4: Commit (istruzione per il dev)** — `feat(oc:8765): traduzioni del messaggio senza cammini`

### Task 3: `emptyState$` e template

**Files:**
- Modify: `projects/wm-core/src/home/home-result/home-result.component.ts` (campi e costruttore)
- Modify: `projects/wm-core/src/home/home-result/home-result.component.html:25` e `:135-139`

**Interfaces:**
- Consumes: `homeResultEmptyState`, `HomeResultEmptyState` (Task 1); `countAll$`, `countLayers$`, `hasActiveRouteFilters$`, `currentLayer$`, `tracksLoading$` già presenti nel componente.
- Produces: `emptyState$: Observable<HomeResultEmptyState>`

- [ ] **Step 1: Aggiungere `emptyState$`** nel costruttore, dopo `countLayers$`: `combineLatest` dei cinque observable (`currentLayer$` mappato a `hasCurrentLayer: layer != null`), `map(homeResultEmptyState)`, `distinctUntilChanged()`.
- [ ] **Step 2: Barra dei tab** — la condizione di `ion-segment` (`html:25`) diventa: `((countAll$|async)>0 || (countLayers$|async)>0) && (emptyState$|async) !== 'filters'`.
- [ ] **Step 3: Blocco di stato vuoto** — sostituire l'`ion-item` di `html:135-139` con:

```html
<div class="wm-home-result-status" role="status">
  <div class="wm-home-result-empty" *ngIf="emptyState$|async as emptyState">
    <ion-icon class="wm-home-result-empty-icon" name="search-outline" aria-hidden="true"></ion-icon>
    <p class="wm-home-result-empty-text">
      {{(emptyState === 'filters' ? 'Spiacenti, non ci sono cammini inerenti alla ricerca' : 'Spiacenti non ci sono risultati con questi criteri di ricerca.')|wmtrans}}
    </p>
  </div>
</div>
```

  Il contenitore `role="status"` resta sempre nel DOM; il padding sta sul figlio, così da vuoto non occupa spazio.
- [ ] **Step 4: Build dell'app** in `core/`: `npx ng build --configuration=development` → nessun errore di template (`strictTemplates`).
- [ ] **Step 5: Commit (istruzione per il dev)** — `feat(oc:8765): stato vuoto unico in home-result e barra dei tab nascosta senza cammini`

### Task 4: Stile e verifica a mano

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-4-aspetto-dello-stato-vuoto)

**Files:**
- Modify: `projects/wm-core/src/home/home-result/home-result.component.scss`

- [ ] **Step 1: Stile**, dentro `wm-home-result { … }`:
  - `.wm-home-result-empty`: flex in colonna, centrato, `text-align: center`, `padding: 32px 16px`.
  - `.wm-home-result-empty-icon`: `font-size: 48px`, `color: var(--wm-color-medium)`.
  - `.wm-home-result-empty-text`: `margin: 12px auto 0`, `max-width: 320px`, `font-size: 16px`, `line-height: 1.4`, `font-weight: 500`, `color: var(--wm-color-darkgrey)`.
- [ ] **Step 2: Verifica su camminiditalia** (`environment.ts` sullo shard camminiditalia, poi riavvio di `npm start`; prova della variante: `curl -s http://localhost:<porta>/main.js | grep -c wm-searchbar-camminiditalia-panel` ≠ 0):
  - home, filtri senza cammini → messaggio «cammini», **nessuna barra di tab vuota**;
  - stessi filtri e poi un cammino aperto → niente messaggio «cammini»;
  - pannello della mappa con gli stessi filtri → messaggio visibile e altezza del pannello accettabile;
  - lista dei download aperta → nessun blocco.
- [ ] **Step 3: Verifica su un altro shard** (per esempio geohub o forestas, con riavvio): ricerca testuale senza risultati → messaggio generico col nuovo aspetto, in home e sulla mappa.
- [ ] **Step 4: Togliere l'eventuale modifica temporanea a `core/tsconfig.spec.json`** (Task 1, Step 2).
- [ ] **Step 5: Commit (istruzioni per il dev)** — in `wm-core`: `feat(oc:8765): stile dello stato vuoto di home-result`; nell'app: bump del puntatore `wm-core`, `feat(oc:8765): aggiorna wm-core con lo stato vuoto di home-result`.
