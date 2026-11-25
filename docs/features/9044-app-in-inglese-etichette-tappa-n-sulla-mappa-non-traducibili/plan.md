> Ticket: oc:9044 (doppione oc:9048)

# «Tappa N» tradotto sulla mappa — piano wm-core e dati

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** con l'app in inglese ogni `ref` di camminiditalia compare tradotto sulla mappa, e cambia lingua senza pan né zoom.

**Architecture:** `wm-geobox-map` passa già `wmMapTranslationCallback`; qui si aggiunge solo il ridisegno al cambio reale di lingua su `refreshLayer$`. Le traduzioni sono dati: chiavi = tutti i `ref` dello shard, nel tab Translations della Resource App di camminiditalia (`translations_en`, `translations_it`), che `AppObserver::saved` scrive nella config (`TRANSLATIONS`).

**Tech Stack:** Angular 20, NgRx, ngx-translate 17; backend camminiditalia (Laravel, wm-package) in Docker locale.

**Spec:** [overview.md](overview.md); parte map-core: `src/app/shared/map-core/docs/features/9044-…/plan.md`, da eseguire prima o insieme al Task 1.

## Global Constraints

- Ordine degli ambienti: locale, poi dev, poi produzione; si passa al successivo solo con la verifica del precedente approvata da Rubens.
- Le chiavi sono i valori di `ref` così come sono in produzione, generate dai dati; i `ref` non si modificano.
- `en`: traduzioni scritte da Webmapp e approvate da Rubens prima di ogni inserimento; `it`: valore uguale alla chiave.
- Le `TRANSLATIONS` esistenti dell'App (`layers`, `Sentieri`, `Punti di interesse`) restano: si aggiunge, non si sostituisce.
- Commit con scope `fix(oc:9044)`; i commit li fa Rubens dopo la review.
- Prima di dire che una verifica è passata: ricaricare la webapp due volte o svuotare la cache (la config arriva prima dalla cache e `TRANSLATIONS` è letto con `take(1)`).

## Review Focus

- Selettore della lingua aperto senza cambiarla: nessun `_updateMap()` (Task 1, controllo sulle richieste di rete dei `.pbf`).
- App in italiano con browser in inglese: «Tappa 1», non «Stage 1» (Task 3).
- `ref` con caratteri particolari («Tappa 34:», «Tappa 5/A», «Tappa2bis»): tradotti come gli altri (Task 2, controllo «0 mancanti»).
- `TRANSLATIONS` esistenti dell'App ancora presenti dopo l'inserimento (Task 2, controllo sulla config).
- Utente che riapre l'app dopo l'inserimento: traduzione visibile dal secondo avvio (Task 3, nota nella verifica).

---

### Task 1: ridisegno al cambio reale di lingua

**Files:**
- Modify: `projects/wm-core/src/geobox-map/geobox-map.component.ts` (`refreshLayer$`, oggi righe 361-363)

**Interfaces:**
- Consumes: `this._langService.onLangChange` (`LangChangeEvent`, campo `lang`), `this._langService.currentLang`; `[wmMapLayerRefresh]="refreshLayer$|async"` già nel template.
- Produces: `refreshLayer$` emette anche la lingua nuova quando cambia davvero.

- [ ] **Step 1: Implementare** `refreshLayer$ = merge(<azioni dei filtri di oggi>, onLangChange → map(e => e.lang) → startWith(currentLang) → distinctUntilChanged() → skip(1))`. Gli operatori mancanti si aggiungono all'import da `rxjs/operators` (riga 88). Commento in italiano: perché `distinctUntilChanged` (il selettore riemette la stessa lingua) e perché qui e non in map-core.

- [ ] **Step 2: Compilare la webapp locale** (già avviata con `npm start` su `localhost:4200`): nessun errore nel log del dev server.

- [ ] **Step 3: Verifica manuale**, Chrome su `localhost:4200/?layer=56`, zoom > 10:
  - aprire il selettore della lingua e premere OK senza cambiare: nessuna richiesta `.pbf` nuova nelle richieste di rete;
  - cambiare lingua: le richieste `.pbf` ripartono una volta e il testo sulle tracce cambia senza pan né zoom (con le traduzioni del Task 2 inserite).

- [ ] **Step 4: Commit (lo fa Rubens)**
  `fix(oc:9044): la mappa ridisegna i ref quando cambia la lingua`

### Task 2: traduzioni dei `ref` nel backend locale

**Files:**
- Create: `LLM_MD/docs/features/9044-app-in-inglese-etichette-tappa-n-sulla-mappa-non-traducibili/ref-translations.json` (chiave `ref` → `en`), generato dall'elenco di produzione (`/api/v2/elasticsearch?app=geohub_app_1`, 157 valori il 25/11/2026)
- Create: `LLM_MD/docs/features/9044-app-in-inglese-etichette-tappa-n-sulla-mappa-non-traducibili/check-ref-translations.py` — legge i `ref` dello shard dalla ricerca e la `TRANSLATIONS` dalla config dell'App (URL passati come argomenti), stampa i `ref` senza chiave in `en` e in `it`, esce con codice 1 se ce n'è almeno uno

**Interfaces:**
- Produces: `translations_en` e `translations_it` dell'App 1 di camminiditalia con tutte le chiavi; `config.json` dell'App con `TRANSLATIONS.en` e `TRANSLATIONS.it` completi.

- [ ] **Step 1: Generare `ref-translations.json`** dai dati di produzione, con l'inglese scritto da Webmapp per ogni chiave («Tappa N» → «Stage N», varianti tradotte per intero: «Tappa 3 (Variante Iblea)» → «Stage 3 (Iblea Variant)», «Percorso Urbano» → …).

- [ ] **Step 2: Mostrare il file a Rubens** e attendere l'approvazione delle traduzioni.

- [ ] **Step 3: Controllo prima dell'inserimento** sul locale:
  Run: `python3 -I check-ref-translations.py http://localhost:8000/api/v2/elasticsearch?app=geohub_app_1 http://localhost:9090/wmfe/camminiditalia/1/config.json`
  Expected: exit 1, con l'elenco dei `ref` mancanti (oggi tutti).

- [ ] **Step 4: Inserire in locale** con `php artisan tinker` nel container `php-camminiditalia`: `App::find(1)`, `translations_en` = esistenti + `ref-translations.json`, `translations_it` = esistenti + ogni chiave con valore uguale alla chiave, `save()` (fa partire `AppObserver::saved` → `writeAppConfigOnAws()`).

- [ ] **Step 5: Controllo dopo l'inserimento**
  Run: lo stesso comando dello Step 3
  Expected: exit 0, «0 mancanti in en, 0 mancanti in it»; nella config le chiavi `layers`, `Sentieri`, `Punti di interesse` ci sono ancora.

### Task 3: verifica completa in locale

- [ ] **Step 1:** webapp locale in inglese, layer 56, zoom > 10: «Stage 1» … «Stage 30», «Stage 28 bis»; nessun «Tappa».
- [ ] **Step 2:** un cammino con varianti (per esempio quello con «Tappa 1 (Variante Iblea)»): tutti i `ref` disegnati in inglese.
- [ ] **Step 3:** app in italiano con il browser in inglese: «Tappa 1».
- [ ] **Step 4:** screenshot per Rubens (inglese e italiano) e sua approvazione per passare a dev.

### Task 4: dev

- [ ] **Step 1:** rileggere i `ref` da dev (`https://camminiditalia.dev.maphub.it/api/v2/elasticsearch?app=geohub_app_1`): valori non presenti in `ref-translations.json` → tradurli e farli approvare.
- [ ] **Step 2:** inserire su dev nel tab Translations dell'App (Nova, o tinker se c'è accesso al server: da decidere con Rubens), stesse regole del Task 2.
- [ ] **Step 3:** controllo «0 mancanti» con gli URL di dev.
- [ ] **Step 4:** verifica con il frontend sul backend dev, approvazione di Rubens.

### Task 5: produzione e riferimenti dei submodule

- [ ] **Step 1:** come il Task 4, sulla produzione (`camminiditalia.maphub.it`, config su `wmfe.s3.eu-central-1.amazonaws.com/camminiditalia`), dopo l'approvazione di Rubens.
- [ ] **Step 2:** PR di map-core e wm-core verso `develop`; dopo il merge, aggiornamento del riferimento ai submodule in webmapp-app e in wm-webapp, ciascuno in un commit suo (da concordare con Rubens).
- [ ] **Step 3:** ripristinare `wm-webapp/src/environments/environment.ts` com'era prima di oc:9044 (copia in `/private/tmp/claude-501/-Users-rubensgarofalo/8029a8c2-c252-46ce-92ea-963733abe782/scratchpad/wm-webapp-environment.ts.prima-oc-9044`; se la copia non c'è più, togliere la chiave `camminiditalia` da `shards` e rimettere `shardName: 'forestas'`).
