> Ticket: oc:8958

# Nomenclatura regioni su "Filtri" — piano `wm-core`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le opzioni del filtro dei cammini (camminiditalia) sono nella lingua attiva anche quando
l'utente non l'ha mai scelta dal profilo, e si aggiornano al cambio lingua.

**Architecture:** in `search-bar.component.camminiditalia.ts` la lingua si risolve come in `wmtrans`
(`currentLang ?? defaultLang ?? 'it'`) e `options$` si ricalcola su `confMAPLayers`, `onLangChange`
e `onFallbackLangChange`.

**Tech Stack:** Angular 20, NgRx 20, ngx-translate 17, RxJS, Karma + Jasmine (dall'app).

**Spec:** [overview.md](overview.md)

## Global Constraints

- Commit con scope `fix(oc:8958): …`, messaggi in italiano; i commit li esegue il dev, dopo il review-gate.
- Branch `feature/oc-8958-nomenclatura-regioni-su-filtri` da `origin/develop` di `wm-core` (`f5e2b7c2`).
- I test di `wm-core` girano solo dall'app: `cd core && npm run test` in `webmapp-app` (Node 22, vedi `.claude/rules/test-unitari.md`).
- Identificatori in inglese, commenti e JSDoc in italiano; JSDoc su ogni metodo nuovo.
- Nessun testo nuovo visibile all'utente: nessuna chiave i18n da aggiungere.

## Review Focus

- Lingua mai scelta dal profilo, telefono in inglese (`currentLang` undefined, `defaultLang` `en`): regioni in inglese (Task 2, test dedicato).
- Lingua del telefono non fra quelle disponibili: `defaultLang` = `l.default` della config, le regioni in quella lingua (Task 2, coperto dalla stessa risoluzione).
- `onLangChange` emesso più volte con la stessa lingua (`lang-selector` chiama `useSavedLang()` due volte): nessun ricalcolo ripetuto (Task 2, `distinctUntilChanged`).
- Selezione attiva durante il cambio lingua: i `value` selezionati restano selezionati e la pillola cambia lingua (Task 2).

---

### Task 1: riproduzione del difetto

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-riproduzione-del-difetto)

- [ ] **Step 1:** in `webmapp-app`, `environment.ts` con `shardName` camminiditalia, `npm start` (riavvio obbligatorio se il server era acceso con un altro shard: `.claude/rules/file-replacements.md`).
- [ ] **Step 2:** browser con lingua inglese, `localStorage.removeItem('wm-lang')`, ricarica, apri il pannello filtri (`panelOpen`).
- [ ] **Step 3:** annota in `notes.md` cosa mostra la riga Regioni. Expected: nomi italiani con il resto dell'interfaccia in inglese. Se mostra già l'inglese, fermati e riporta al dev prima del Task 2.

### Task 2: lingua risolta e ricalcolo delle opzioni

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-lingua-risolta-e-ricalcolo-delle-opzioni)

**Files:**
- Modify: `projects/wm-core/src/search-bar/search-bar.component.camminiditalia.ts` (`options$` righe 83-85, `_deriveOptions()` riga 172)
- Create: `projects/wm-core/src/search-bar/search-bar.component.camminiditalia.spec.ts`
- Modify (in `webmapp-app`): `core/tsconfig.spec.json` (`include`) e `core/angular.json` (`architect.test.options.include`): aggiungi `src/app/shared/wm-core/projects/wm-core/src/search-bar/**/*.spec.ts`

**Interfaces:**
- Produces: `private _resolveLang(): Language` — `currentLang ?? defaultLang ?? 'it'`, usato da `_deriveOptions()`.

- [ ] **Step 1: Scrivi lo spec che fallisce**, con `LangService` finto (`currentLang`, `defaultLang`,
`instant`, `onLangChange` e `onFallbackLangChange` come `Subject`) e store mock con
`confMAPLayers` = un layer con `attributes.taxonomy_where = [{value: 'sardinia', name: {it: 'Sardegna', en: 'Sardinia'}}, {value: 'aosta-valley', name: {it: "Valle d'Aosta", en: 'Aosta Valley'}}]`:
  - `uses the fallback language when no language was chosen`: `currentLang` undefined, `defaultLang` `'en'` → `options.regions.map(o => o.label)` è `['Aosta Valley', 'Sardinia']`.
  - `recomputes the options when the language changes`: parte da `it` (`["Sardegna", "Valle d'Aosta"]`), poi `currentLang = 'en'` ed emissione su `onLangChange` → `['Aosta Valley', 'Sardinia']`.
  - `recomputes the options when the fallback language arrives`: `currentLang` undefined, `defaultLang` prima `'it'` poi `'en'` con emissione su `onFallbackLangChange` → `label` inglesi.
  - `keeps the region values across a language change`: i `value` sono `['aosta-valley', 'sardinia']` prima e dopo.

- [ ] **Step 2: Aggiungi la cartella ai due elenchi dei test e lancia la suite** — `npm run test`. Expected: i nuovi test FAIL, e il totale della suite cresce di 4 (se non cresce, lo spec non è incluso).

- [ ] **Step 3: Implementa.** `_resolveLang()` e il suo uso in `_deriveOptions()`; `options$` =
`combineLatest([confMAPLayers, merge(onLangChange, onFallbackLangChange).pipe(map(() => this._resolveLang()), startWith(this._resolveLang()), distinctUntilChanged())])`
→ `_deriveOptions(layers ?? [])`.

- [ ] **Step 4: Lancia la suite e verifica che passi.** Expected: PASS, totale +4.

- [ ] **Step 5: Verifica in browser** con lo scenario del Task 1: Regioni in inglese, ordinate in inglese; poi cambio lingua dal profilo in `it` e di nuovo in `en`, con una regione selezionata: selezione mantenuta, pillola tradotta.

- [ ] **Step 6: Commit (lo esegue il dev)** — in `wm-core`: `fix(oc:8958): filtro cammini nella lingua attiva anche senza lingua scelta`; in `webmapp-app` gli elenchi dei test vanno nel commit del puntatore (Task 3).

### Task 3: puntatori del submodule

- [ ] **Step 1:** dopo il merge di `wm-core` su `develop`, in `webmapp-app` porta `core/src/app/shared/wm-core` a quel commit e committa insieme agli elenchi dei test: `chore(oc:8958): aggiorna wm-core`.
- [ ] **Step 2:** in `wm-webapp` stesso bump di `src/app/shared/wm-core`, in un commit suo. Il checkout della webapp è oggi su `198fa7a`, fuori da `develop`: chiedi al dev su quale branch della webapp fare il bump prima di toccarlo.
