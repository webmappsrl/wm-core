> Ticket: oc:8701

# Passaporto: stato delle tappe nelle box — piano di implementazione

> **Per chi esegue:** usare `superpowers:subagent-driven-development` o `superpowers:executing-plans`, un task alla volta. **Nessun `git commit`, `git add`, `git push` o branch automatico**: i commit qui sotto sono istruzioni testuali per il dev, da eseguire solo dopo la sua approvazione.

**Obiettivo:** in camminiditalia, chip di stato sulle card delle tappe e anello di progresso sulle card dei cammini, letti da `/api/passport` e `/api/layer/{id}/progress`.

**Architettura:** `PassportService` aggiunge uno stream condiviso di `/api/passport` (anelli) e un indice delle tappe validate costruito dalle `/progress` dei soli cammini iniziati (chip). Due varianti camminiditalia complete, `layer-box` e `search-box`, attivate con `fileReplacements` nel `core/angular.json` dell'app, leggono quegli stream. La webapp è fuori scope finché il passaporto non arriva in `develop` di `wm-core`. I file di default non cambiano.

**Stack:** Angular 20, Ionic 8, NgRx 20, RxJS, Karma + Jasmine.

**Spec:** [overview.md](overview.md)

## Vincoli globali

- Percorsi relativi a `projects/wm-core/src/` di `wm-core`, salvo dove indicato.
- Varianti via `fileReplacements` (vedi le divergenze dei task 3 e 4 in [notes.md](notes.md) per le classi base).
- Il comportamento di `layer-box` e `search-box` di default resta **identico** per gli altri shard.
- JSDoc su ogni funzione e metodo, membri privati con `_`, commenti e documentazione in italiano.
- i18n: si usano solo chiavi già esistenti — `'percorsa il {{date}}'`, `'non ancora percorsa'`, `'{{percent}}% completato'`, `'Cammino completato'`. Nessuna chiave nuova.
- Data del chip: `passportShortDate(iso, lang)` di `passport/passport.utils.ts`.
- Colori: variabili di `passport/_passport-theme.scss` (`$passport-green`, `$passport-green-bg`, `$passport-green-dark`, `$passport-ring-bg`).
- Utente non loggato, tracce UGC, carosello della mappa, cammino senza logo: **nulla di mostrato**.

## Punti da controllare in review

1. **Prima lettura fallita di un solo cammino**: le card di quel cammino non mostrano il chip; quelle degli altri sì (test nel task 2).
2. **Cambio utente sullo stesso dispositivo**: dopo logout e login di un altro utente, nessun chip o anello del precedente prima della nuova lettura (test nel task 1).
3. **Prima tappa di un cammino nuovo**: `refreshProgress(id)` rilegge anche `/api/passport`, e il cammino entra nell'indice (test nel task 1 e 2).
4. **«I miei percorsi»**: con `ugcOpened` vero la card non mostra il chip anche se l'id coincide con una tappa validata (test nel task 3).
5. **Id stringa nell'hit**: `hit.id = '203'` viene riconosciuto come la tappa 203 (test nel task 2).

---

### Task 1: stream di `GET /api/passport`

**File:**
- Modifica: `../../../../wm-types/src/passport.ts` (aggiunta di un tipo)
- Modifica: `passport/passport.service.ts`
- Test: `passport/passport.service.spec.ts`

**Interfacce prodotte:**
- `wm-types`: `export interface PassportRoute { layerId: number; validated: number; total: number; percent: number; completed: boolean; }`
- `PassportService.passportRoutes$(): Observable<Map<number, PassportRoute> | null>`: `null` se l'utente non è loggato o non c'è mai stata una lettura riuscita.
- `PassportService.refreshProgress(layerId: number): void`: rilegge anche `/api/passport`.

- [ ] **Step 1: test che falliscono**, in un nuovo `describe('passaporto: GET /api/passport (oc:8701)')`, con `createQuiet()` e `http.get` che risponde per URL:
  - `chiama /api/passport e indicizza i cammini per layer_id`: risposta `{routes: [{layer_id: 40, validated: 6, total: 13, percentage: 46, completed: false}, {layer_id: 63, validated: 6, total: 6, percentage: 100, completed: true}]}` → `http.get` chiamato con `` `${ORIGIN}/api/passport` ``, mappa con chiavi `[40, 63]`, `get(40)` uguale a `{layerId: 40, validated: 6, total: 13, percent: 46, completed: false}`.
  - `utente non loggato: null senza chiamare l'API` → valore `null`, `http.get` non chiamato.
  - `errore alla prima lettura: null`; `errore dopo una lettura riuscita: ultimo valore`.
  - `due iscritti, una sola richiesta`.
  - `refreshProgress rilegge anche /api/passport` → dopo `refreshProgress(40)`, due chiamate a `/api/passport`.
  - `al logout l'ultimo valore si dimentica`: store con `isLogged` da un `BehaviorSubject`; lettura riuscita, poi `false`, poi `true` con errore → `null`, non il valore precedente.
- [ ] **Step 2:** `npm run test:single` nella root di `wm-core` → i nuovi test falliscono (`passportRoutes$ is not a function`).
- [ ] **Step 3: implementazione.**
  - Interfaccia privata `PassportResponse { routes: Array<{layer_id: number; validated: number; total: number; percentage: number; completed: boolean}> }` accanto a `ProgressResponse`.
  - Campi `_passportRefresh$ = new Subject<void>()`, `_lastRoutes: Map<number, PassportRoute> | null = null`, `_routes$` creato una volta, nel costruttore o la prima volta che serve.
  - `passportRoutes$()`: `store.select(isLogged)` → `switchMap(logged => logged ? merge(of(undefined), this.appResume$(), this._passportRefresh$).pipe(switchMap(() => GET /api/passport → mappa, tap(salva _lastRoutes), catchError(() => of(this._lastRoutes)))) : of(null))`, poi `shareReplay({bufferSize: 1, refCount: true})`.
  - Il `subscribe` su logout già presente nel costruttore azzera anche `_lastRoutes`.
  - `refreshProgress` aggiunge `this._passportRefresh$.next()`.
  - Aggiorna il JSDoc della classe con la nuova rotta.
- [ ] **Step 4:** `npm run test:single` → tutti i test di `passport.service.spec.ts` passano, compresi quelli già esistenti.
- [ ] **Step 5 (commit, solo dopo l'ok del dev):** `feat(oc:8701): stream condiviso di /api/passport nel PassportService` in `wm-core`, e `feat(oc:8701): tipo PassportRoute` in `wm-types`.

### Task 2: indice delle tappe validate e stato del chip

**File:**
- Modifica: `../../../../wm-types/src/passport.ts`
- Modifica: `passport/passport.service.ts`, `passport/passport.utils.ts`
- Test: `passport/passport.service.spec.ts`, `passport/passport.utils.spec.ts`

**Interfacce:**
- Consuma: `passportRoutes$()`, `progress$(layerId)` (task 1 ed esistente).
- Produce, in `wm-types`:
  - `export interface PassportStageIndex { completedAt: Map<number, string>; pendingLayers: Set<number>; }`: data di validazione per `trackId`, più i cammini iniziati la cui `/progress` non ha mai risposto.
  - `export type PassportStageChip = {status: 'completed'; completedAt: string} | {status: 'not_started'};`
- Produce, nel service: `PassportService.stageIndex$(): Observable<PassportStageIndex | null>`.
- Produce, in utils: `passportStageChip(index: PassportStageIndex | null, trackId: number | string | null | undefined, layers: number[] | null | undefined): PassportStageChip | null`.

- [ ] **Step 1: test che falliscono.**
  - utils, `describe('passportStageChip (oc:8701)')`:
    - `index null → null`;
    - `trackId NaN o assente → null`;
    - `tappa validata → {status: 'completed', completedAt}`, anche con `trackId: '203'`;
    - `tappa non validata, cammini noti → {status: 'not_started'}`;
    - `tappa non validata, uno dei suoi layer in pendingLayers → null`;
    - `tappa validata, anche se un altro suo layer è pendente → completed`;
    - `layers assente → trattato come []`.
  - service, `describe('indice delle tappe validate (oc:8701)')`:
    - `/api/passport` con layer 40 (`validated: 6`) e 63 → chiama `/progress` solo di 40 e 63, e `completedAt` contiene le tappe `validated` dei due (fixture `LAYER_40_PROGRESS`, `LAYER_63_PROGRESS`);
    - `nessun cammino iniziato → indice vuoto, nessuna /progress`;
    - `/progress di 63 fallisce alla prima lettura → pendingLayers = {63}, le tappe di 40 restano`;
    - `utente non loggato → null`.
- [ ] **Step 2:** `npm run test:single` → falliscono.
- [ ] **Step 3: implementazione.**
  - `stageIndex$()`: da `passportRoutes$()`; `null` → `of(null)`. Con i soli `layerId` di `validated > 0`: nessuno → `of({completedAt: new Map(), pendingLayers: new Set()})`, altrimenti `combineLatest` dei `progress$(id)`. Un `progress$` che dà `null` mette `id` in `pendingLayers`. Le tappe con `status === 'completed'` e `completedAt` entrano in `completedAt`. Condiviso con `shareReplay({bufferSize: 1, refCount: true})`.
  - `passportStageChip`: `Number(trackId)`; `NaN` → `null`; presente in `completedAt` → `completed`; un layer di `layers` in `pendingLayers` → `null`; altrimenti `not_started`.
- [ ] **Step 4:** `npm run test:single` → passano.
- [ ] **Step 5 (commit, solo dopo l'ok del dev):** `feat(oc:8701): indice delle tappe validate e stato del chip`.

### Task 3: variante camminiditalia di `search-box` con il chip

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3-e-4-classi-base-invece-di-varianti-complete)

**File:**
- Crea: `box/search-box/search-box.component.camminiditalia.ts`, `.html`, `.scss`
- Test: `box/search-box/search-box.component.camminiditalia.spec.ts`

**Interfacce:**
- Consuma: `stageIndex$()`, `passportStageChip`, `passportShortDate`, il selettore `ugcOpened` (`store/user-activity/user-activity.selector.ts`).
- Produce: classe `SearchBoxComponent`, stesso nome, selettore `wm-search-box`, stessi input e output dell'originale; `chip$: Observable<PassportStageChip | null>`.

- [ ] **Step 1: test che falliscono**, istanziando la classe con `new` (store e service finti, come in `passport.service.spec.ts`):
  - `chip completed con data`: indice con la tappa 203 al `2026-05-12T10:00:00+00:00`, `data = {id: 203, layers: [40]}` → `chip$` emette `{status: 'completed', completedAt: '2026-05-12T10:00:00+00:00'}`;
  - `chip not_started`;
  - `ugcOpened vero → null`, anche con l'id 203 validato;
  - `stageIndex$ null (non loggato) → null`;
  - `il cambio di data ricalcola chip$` (`ngOnChanges`).
- [ ] **Step 2:** `npm run test:single` → falliscono (file assente).
- [ ] **Step 3: implementazione.**
  - `.ts`: copia di `search-box.component.ts`. Commento in testa: «Variante camminiditalia di search-box.component.ts (oc:8701): ogni correzione all'originale va riportata qui.» `templateUrl` e `styleUrls` propri; lo `styleUrls` include anche lo SCSS di origine, `['./search-box.component.scss', './search-box.component.camminiditalia.scss']`, così lo stile comune non si duplica.
  - Inietta `PassportService` e `LangService`. `ngOnChanges` costruisce `chip$ = combineLatest([store.select(ugcOpened), passportSvc.stageIndex$()])`, con `ugc` vero → `null`, altrimenti `passportStageChip(index, data?.id, data?.layers)`.
  - Metodo `chipDate(iso: string): string` → `passportShortDate(iso, this._langSvc.currentLang)`.
  - `.html`: copia dell'originale più, subito dopo `.wm-search-box-properties`:
    ```html
    <div *ngIf="chip$ | async as chip" class="wm-passport-stage-chip" [class.wm-passport-stage-chip--done]="chip.status === 'completed'">
      <ng-container *ngIf="chip.status === 'completed'; else todo">✓ {{ 'percorsa il {{date}}' | wmtrans: {date: chipDate(chip.completedAt)} }}</ng-container>
      <ng-template #todo>○ {{ 'non ancora percorsa' | wmtrans }}</ng-template>
    </div>
    ```
  - `.scss`: chip a pillola, testo `$passport-green-dark` su `$passport-green-bg` per lo stato «percorsa», grigio scuro (`#555`) su `#f0efeb` per «non ancora». Il contrasto va verificato ≥ 4.5:1 con un calcolatore e annotato in un commento. Più `wm-features-in-viewport .wm-passport-stage-chip { display: none; }` per il carosello (102px fissi).
- [ ] **Step 4:** `npm run test:single` → passano.
- [ ] **Step 5 (commit, solo dopo l'ok del dev):** `feat(oc:8701): variante camminiditalia di search-box con lo stato della tappa`.

### Task 4: variante camminiditalia di `layer-box` con l'anello

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3-e-4-classi-base-invece-di-varianti-complete)

**File:**
- Crea: `box/layer-box/layer-box.component.camminiditalia.ts`, `.html`, `.scss`
- Test: `box/layer-box/layer-box.component.camminiditalia.spec.ts`

**Interfacce:**
- Consuma: `passportRoutes$()`, `passportRingDegrees`, `toLayerId`.
- Produce: classe `LayerBoxComponent`, stesso nome, selettore, input e output dell'originale; `ring$: Observable<{deg: number; percent: number; completed: boolean} | null>`.

- [ ] **Step 1: test che falliscono**, sul modello di `layer-box.component.spec.ts`, importando la variante:
  - `cammino in corso → ring {deg: 165.6, percent: 46, completed: false}`;
  - `cammino completato → deg 360, completed true`;
  - `cammino assente dalla mappa → null`;
  - `passportRoutes$ null → null`;
  - i test esistenti del cuoricino dei preferiti passano anche sulla variante. Se `layer-box.component.spec.ts` non è parametrico, estrai una funzione `describeLayerBoxFavoriteBehavior` in `layer-box-favorite.spec-support.ts`, come per `home-layer`.
- [ ] **Step 2:** `npm run test:single` → falliscono.
- [ ] **Step 3: implementazione.**
  - `.ts`: copia completa di `layer-box.component.ts`, con commento in testa come nel task 3 e `styleUrls: ['./layer-box.component.scss', './layer-box.component.camminiditalia.scss']`.
  - Inietta `PassportService`. In `ngOnChanges`: `ring$ = passportSvc.passportRoutes$().pipe(map(routes => routes?.get(toLayerId(data.layer.id)) ?? null), map(r => r && {deg: passportRingDegrees(r.percent), percent: r.percent, completed: r.completed}))`.
  - Nessuna modifica a `WmPassportLogoRingDirective`: il verde pieno del completato viene da `percent` 100 → 360°.
  - `.html`: copia dell'originale. Sul `wm-img.wm-layer-box-logo-overlay` (che resta sotto `*ngIf="data.layer.logo_image | hasLogo"`) aggiungi `[class.wm-passport-logo-ring]="ring"`, `[style.--wm-passport-ring-deg.deg]="ring?.deg"`, `role="img"` e `[attr.aria-label]="ring ? (ring.completed ? ('Cammino completato' | wmtrans) : ('{{percent}}% completato' | wmtrans: {percent: ring.percent})) : null"`, con `ring` da `ring$ | async` in un `ng-container *ngIf="{ring: ring$ | async} as vm"` attorno al logo.
  - `.scss`: anello con `conic-gradient($passport-green 0deg var(--wm-passport-ring-deg, 0deg), $passport-ring-bg var(--wm-passport-ring-deg, 0deg) 360deg)`, `padding: 4px`, logo interno su fondo bianco e rotondo, più `box-shadow: 0 1px 3px rgba(0,0,0,.4)` per lo stacco dalla foto. I selettori partono da `wm-layer-box wm-img.wm-layer-box-logo-overlay.wm-passport-logo-ring`.
- [ ] **Step 4:** `npm run test:single` → passano.
- [ ] **Step 5 (commit, solo dopo l'ok del dev):** `feat(oc:8701): variante camminiditalia di layer-box con l'anello del passaporto`.

### Task 5: attivazione nell'app, verifica

**File:**
- Modifica: `webmapp-app/core/angular.json`, configuration `camminiditalia` di `architect.build` (righe 97-111)

- [ ] **Step 1:** aggiungi a `fileReplacements`:
  ```json
  {"replace": "src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.ts",
   "with": "src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.camminiditalia.ts"},
  {"replace": "src/app/shared/wm-core/projects/wm-core/src/box/search-box/search-box.component.ts",
   "with": "src/app/shared/wm-core/projects/wm-core/src/box/search-box/search-box.component.camminiditalia.ts"}
  ```
  La configuration `serve` punta già con `buildTarget` a `build:camminiditalia`: niente da aggiungere lì.
- [ ] **Step 2:** `cd core && npx ng build --configuration=camminiditalia` in `webmapp-app` → build senza errori. Poi `npx ng build` (default) → build senza errori, e nel bundle di default nessuna stringa `wm-passport-stage-chip` (`grep -r wm-passport-stage-chip www/ | wc -l` → 0).
- [ ] **Step 3: prova manuale** con `npm start` in camminiditalia e un utente con almeno un cammino in corso e uno completato:
  - home generale: anello parziale, anello pieno verde, nessun anello sul non iniziato e sui cammini senza logo;
  - home di un cammino: chip su ogni tappa, con le date;
  - ricerca testuale: chip sulle tappe fra i risultati;
  - «I miei percorsi»: nessun chip;
  - mappa: nessun chip nel carosello;
  - validazione della prima tappa di un cammino nuovo e chiusura della modale: chip e anello compaiono senza riavviare;
  - logout: niente chip e niente anelli;
  - un altro shard (`npm start` su uno shard diverso): card identiche a prima.
- [ ] **Step 4 (commit, solo dopo l'ok del dev):** `feat(oc:8701): attiva le varianti camminiditalia di layer-box e search-box` in `webmapp-app`, insieme all'aggiornamento dei puntatori ai submodule `wm-core` e `wm-types`.
