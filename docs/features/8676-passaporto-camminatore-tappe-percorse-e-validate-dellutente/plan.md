> Ticket: oc:8676

# Tappe percorse e validate nel passaporto: piano di implementazione

> **Per chi esegue:** sub-skill richiesta `superpowers:executing-plans` o
> `superpowers:subagent-driven-development`. I passi usano le checkbox (`- [ ]`).
> **Nessun commit e nessun branch automatico:** i passi «Commit» sono istruzioni per il dev, che
> li esegue solo dopo la review.

**Obiettivo:** badge, anello e dettaglio del passaporto mostrano le tappe che il gestore ha
davvero riconosciuto, lette da `GET /api/layer/{layer}/progress`, e il tocco su una tappa apre la
sua pagina dentro la modale.

**Architettura:** `wm-types` allinea `PassportStage` al backend. `PassportService` sostituisce il
mock con la chiamata vera e la conversione, ed espone per ogni layer uno stream condiviso che si
rilegge su richiesta e al `resume` e che, se una lettura fallisce, ripiega sull'ultimo valore letto
nella sessione. Il dettaglio legge quello stream, ordina le tappe nella lingua corrente e mostra
uno stato d'errore con «Riprova». La pagina della tappa è un componente nuovo spinto nell'`ion-nav`
della modale, come il form.

**Stack:** Angular 20, Ionic 8, RxJS, `@capacitor/app`, Karma + Jasmine (test di classe senza
`TestBed`, come gli spec esistenti del passaporto).

**Spec:** `docs/features/8676-passaporto-camminatore-tappe-percorse-e-validate-dellutente/overview.md`
in wm-core, con la versione breve nello stesso percorso di wm-types. Riferimento grafico: viste 1,
2 e 3 di <https://webmappsrl.github.io/webmapp-app/index.html>.

Percorsi relativi a `core/src/app/shared/`; `W` = `wm-core/projects/wm-core/src`.

## Vincoli globali

- Contratto di ogni voce di `tracks[]`: `{id, name, distance, status, progress, validated_at, source}`,
  con `name` oggetto di traduzioni (anche `{}`), `distance` in km con un decimale, `status`
  `validated|not_validated`, `progress` 0-100, `validated_at` ISO UTC o `null`, `source`
  `manual|gps|null`. Livello cammino: `layer_id, validated, total, percentage, completed,
  km_validated, km_total`.
- Conversione: `validated → completed`, `not_validated` con `progress > 0` → `in_progress`
  (`percent = progress`), ogni altro valore → `not_started`. Nessun ricalcolo dei totali lato app.
- Il completamento si legge da `completed` del backend, mai da `percent` né da `progress`.
- Ordinamento delle tappe: nome tradotto, `localeCompare(b, lang, {numeric: true})`, nome vuoto in
  fondo.
- Date: «12 mag» nella lista, «percorsa il 12 mag» nella pagina della tappa, `Intl.DateTimeFormat`
  con `{day: 'numeric', month: 'short'}` nella lingua dell'app (`pr` → `pt`), fuso del dispositivo.
- Distanza `0` o assente: la riga non si mostra.
- i18n: chiave = testo italiano, ripetuto come valore in `it.ts`, in `it, en, de, fr, es, pr, sq`.
  Prima di aggiungere una chiave cercala: `'Riprova'` esiste già (`it.ts:288`), e un duplicato non
  compila.
- JSDoc su ogni funzione e metodo; commenti e documentazione in italiano.
- **Mai `git add -A` né `git commit -a`.** I file si aggiungono per nome. Non toccare e non
  committare `core/src/environments/environment.ts` (app) e `wm-types/src/environment.ts`: servono
  alla prova a mano. Prima di ogni commit: `git diff --cached --name-only` non contiene
  `environment.ts`.
- Trappole da rispettare: `wm-core/.claude/rules/modali-e-ion-nav.md` (stream stabile con
  `BehaviorSubject` in `OnPush` dentro `ion-nav`, niente `[root]`) e
  `wm-core/.claude/rules/spec-e-testbed.md` (non spiare i Proxy di Capacitor: si spia
  `_addResumeListener`).

## Review Focus

- **Prima lettura fallita nel dettaglio** (offline al primo tocco): il dettaglio mostra
  «Impossibile caricare le tappe» e «Riprova», mai uno spinner eterno. Test nel Task 4.
- **Errore dopo una lettura riuscita** (segnale perso in sentiero): badge, anello e dettaglio
  restano sull'ultimo valore, non spariscono. Test nel Task 3.
- **Due consumatori sullo stesso layer** (badge e anello montati insieme): una sola richiesta HTTP.
  Test nel Task 3.
- **Cambio lingua con il dettaglio aperto**: l'ordine delle tappe si ricalcola. Test nel Task 4.
- **Chiusura della modale dopo un'approvazione**: il badge della home si rilegge e mostra lo stesso
  numero del dettaglio. Test nel Task 5.

---

### Task 1: tipi del passaporto in wm-types

**File:**
- Modifica: `wm-types/src/passport.ts`
- Docs: `wm-types/docs/features/8676-passaporto-camminatore-tappe-percorse-e-validate-dellutente/overview.md` (già scritta)

**Interfacce:**
- Produce:
  - `export type PassportStageSource = 'manual' | 'gps';`
  - `PassportStage`: `trackId: number; name: Partial<Record<Language, string>>; status: PassportStageStatus; distance: number; source?: PassportStageSource; completedAt?: string; percent?: number;`
  - `PassportProgress`: i campi di oggi più `completed: boolean`.

- [ ] **Passo 1:** aggiorna `PassportStage` e `PassportProgress` come sopra, con l'import di
  `Language` da `./language`. Riscrivi il commento in testa al file: il contratto è quello del
  backend camminiditalia di oc:8676, e `in_progress`/`percent` restano per il GPS di oc:8165.
- [ ] **Passo 2:** in wm-core, `npm run test:single`. Atteso: la compilazione fallisce nel mock di
  `passport.service.ts` (`name` stringa, manca `completed`). È il segnale che il Task 3 deve
  sostituirlo, non un errore da correggere qui.
- [ ] **Passo 3 (dev): commit in wm-types**

  ```bash
  git -C wm-types add src/passport.ts docs/features/8676-passaporto-camminatore-tappe-percorse-e-validate-dellutente/
  git -C wm-types diff --cached --name-only   # niente environment.ts
  git -C wm-types commit -m "feat(oc:8676): allinea PassportStage al contratto delle tappe validate"
  ```

### Task 2: ordinamento e data in `passport.utils.ts`

**File:**
- Modifica: `W/passport/passport.utils.ts`
- Crea: `W/passport/passport.utils.spec.ts`
- Modifica: `W/passport/passport-detail/passport-detail.component.ts` (`shortDate` delega alla
  funzione nuova)

**Interfacce:**
- Produce:
  - `sortStages(stages: PassportStage[], lang: string): PassportStage[]` — copia ordinata, non muta
    l'input. Nome di ordinamento: `name[lang] ?? name.it ?? primo valore ?? ''`.
  - `stageName(stage: PassportStage, lang: string): string` — lo stesso nome usato per ordinare.
  - `passportShortDate(iso: string | undefined, lang: string): string` — «12 mag», `''` se assente.

- [ ] **Passo 1: test che falliscono** in `passport.utils.spec.ts`:
  - `sortStages` su `Tappa 10`, `Tappa 02`, `Tappa 09 Variante`, `Tappa 09` in `it` dà
    `Tappa 02, Tappa 09, Tappa 09 Variante, Tappa 10`;
  - una tappa con `name: {}` finisce in fondo;
  - con `lang = 'en'` e solo `it` valorizzato si ordina sul nome italiano;
  - l'array di input resta nell'ordine originale;
  - `passportShortDate('2026-09-30T14:45:55+00:00', 'it')` contiene `30` e `set`;
    `passportShortDate(undefined, 'it') === ''`; `lang = 'pr'` non lancia.
- [ ] **Passo 2:** `npm run test:single`. Atteso: FALLISCONO (funzioni non definite).
- [ ] **Passo 3:** implementa le tre funzioni. Sposta in `passportShortDate` la logica di
  `shortDate` del dettaglio (`pr` → `pt`, fallback `it`), e fai delegare `shortDate` a lei.
- [ ] **Passo 4:** `npm run test:single`. Atteso: PASS dei test nuovi (il resto può non compilare
  finché non c'è il Task 3).

### Task 3: progresso vero nel service

**File:**
- Modifica: `W/passport/passport.service.ts`
- Modifica: `W/passport/passport.service.spec.ts`
- Crea: `W/passport/passport-progress.fixtures.ts` (solo per gli spec)

**Interfacce:**
- Consuma: i tipi del Task 1.
- Produce:
  - `getProgress(layerId: number): Observable<PassportProgress>` — una GET, gli errori si
    propagano.
  - `progress$(layerId: number): Observable<PassportProgress | null>` — stream condiviso per layer:
    `null` solo se non c'è mai stata una lettura riuscita.
  - `refreshProgress(layerId: number): void` — rilegge lo stream di quel layer.
  - `visibleProgress(layerId: number | null): Observable<PassportProgress | null>` — come oggi
    (`null` se non loggato o `totalStages === 0`), ma sopra `progress$`.

- [ ] **Passo 1: fixture.** In `passport-progress.fixtures.ts` esporta i JSON reali del backend
  come costanti: `LAYER_40_PROGRESS` (13 tappe, 6 validate, quello del messaggio del backend del
  01/10 con `progress` 100/0), `LAYER_63_PROGRESS` (3 tappe `not_validated`, distanze `0.0`),
  `LAYER_30_PROGRESS` (`total` 0, `tracks: []`). Più `LAYER_40_GPS_PARTIAL`: la 40 con la tappa
  216 a `progress: 62`, costruita a mano e dichiarata come tale nel commento.
- [ ] **Passo 2: test che falliscono** in `passport.service.spec.ts` (`HttpClient` finto con
  `of(fixture)` / `throwError`, store finto con `isLogged`):
  - `getProgress(40)` chiama `${origin}/api/layer/40/progress` e dà `totalStages 13`,
    `completedStages 6`, `percent 46`, `completed false`, 13 `stages`; la tappa 203 è `completed`
    con `completedAt '2026-09-30T14:45:55+00:00'`, `distance 19.5`, `source 'manual'`, `name.it`
    che inizia con `Cammino Grande di Celestino - Tappa 06`;
  - le tappe `not_validated` con `progress 0` sono `not_started`, senza `completedAt`;
  - `LAYER_40_GPS_PARTIAL`: la 216 è `in_progress` con `percent 62`, e `completedStages` resta 6;
  - uno `status` sconosciuto diventa `not_started`;
  - `LAYER_30_PROGRESS` → `visibleProgress(30)` emette `null`;
  - due sottoscrizioni contemporanee a `progress$(40)` fanno **una** sola GET;
  - dopo una lettura riuscita, `refreshProgress(40)` con la GET che fallisce riemette l'ultimo
    valore; senza una lettura riuscita emette `null`;
  - `refreshProgress(40)` rilegge solo il layer 40, non il 63;
  - il `resume` (spia su `_addResumeListener`) rilegge `progress$`.
  Rimuovi i test del mock (`layerFeaturesTotalCount`, `layerId % 3`).
- [ ] **Passo 3:** `npm run test:single`. Atteso: FALLISCONO.
- [ ] **Passo 4:** implementa. Togli `MOCK_LATENCY_MS`, `_mockProgress`, l'import di
  `layerFeaturesTotalCount`, `delay`, e l'avviso «⚠️ MOCK» del commento della classe, a cui
  aggiungi la riga del GET di `/progress`. Interfaccia privata `ProgressResponse` sul contratto dei
  Vincoli globali e `_toProgress(res): PassportProgress`. Stato privato:
  `Map<number, Observable<PassportProgress | null>>` degli stream, `Map<number, PassportProgress>`
  dell'ultimo valore, `Subject<number>` dei refresh. Ogni stream: trigger iniziale + `appResume$()`
  + refresh filtrati per layer → `switchMap` su `getProgress` con `tap` sull'ultimo valore e
  `catchError(() => of(ultimo ?? null))` dentro la singola lettura →
  `shareReplay({bufferSize: 1, refCount: true})`. Niente localStorage.
- [ ] **Passo 5:** `npm run test:single`. Atteso: PASS, compresi i test esistenti della
  certificazione.

### Task 4: dettaglio dal badge

**File:**
- Modifica: `W/passport/passport-detail/passport-detail.component.{ts,html,scss}`
- Modifica: `W/passport/passport-detail/passport-detail.component.spec.ts`

**Interfacce:**
- Consuma: `progress$`, `refreshProgress` (Task 3); `sortStages`, `stageName`,
  `passportShortDate` (Task 2).
- Produce:
  - `PassportDetailVm.progress: PassportProgress | null` (`null` = prima lettura fallita) e
    `PassportDetailVm.stages: PassportStage[]` già ordinate.
  - `PassportDetailHost.openStage(stage: PassportStage): Promise<void>` (implementato nel Task 5).
  - `stageLabel(stage: PassportStage): string` per il template.

- [ ] **Passo 1: test che falliscono** (componente costruito con `new`, come oggi):
  - progresso `null` → `vm.progress === null`, la certificazione è comunque nel vm, `showCta`
    false;
  - le `stages` del vm sono ordinate (`Tappa 01` prima di `Tappa 06` sulla fixture della 40);
    al cambio lingua (`onLangChange` finto) il vm riemette ordinato nella lingua nuova;
  - `showEmailHint` è `false` per `approved`, `true` per `rejected` senza nota, `false` per
    `rejected` con nota;
  - con `completed: true` e `percent 99` `showRetry` dopo un'approvazione è `false`; con
    `completed: false` e `percent 100` è `true` (il completamento viene dal backend);
  - `refresh()` chiama `refreshProgress(layerId)` e rilegge la certificazione.
- [ ] **Passo 2:** `npm run test:single`. Atteso: FALLISCONO.
- [ ] **Passo 3:** implementa nel `.ts`. `vm$` combina `progress$(layerId)` (al posto di
  `getProgress`), la certificazione come oggi e `onLangChange` con `startWith`. `refresh()` emette
  su `_refresh$` e chiama `refreshProgress(layerId)`. Le regole `notDone` usano `!progress.completed`.
- [ ] **Passo 4:** template e stili:
  - testata vuota se `vm.progress` è `null`; «Nessuna tappa registrata via GPS» → «Nessuna tappa
    ancora riconosciuta»; `vm.progress.percent === 100` → `vm.progress.completed`;
  - al posto della lista, se `vm.progress` è `null`: «Impossibile caricare le tappe» con
    `role="alert"` e il bottone «Riprova» che chiama `refresh()`;
  - ogni riga della lista è un `button` che chiama `host?.openStage(stage)`, con
    `stageLabel(stage)` (nome via `stageName`) al posto di `stage.name`, altezza minima 44px,
    feedback al tocco (`:active`) e nome che va a capo senza spingere fuori la data;
  - il rimando all'email dopo l'approvazione non c'è più (resta quello del rifiuto).
- [ ] **Passo 5:** `npm run test:single`. Atteso: PASS.

### Task 5: pagina della tappa e rilettura del badge

**File:**
- Crea: `W/passport/passport-stage-detail/passport-stage-detail.component.{ts,html,scss,spec.ts}`
- Modifica: `W/passport/passport-modal/passport-modal.component.ts` (`openStage`)
- Modifica: `W/passport/passport-progress-badge/passport-progress-badge.component.ts` (rilettura
  alla chiusura della modale) e il suo spec
- Modifica: `W/wm-core.module.ts` (dichiarazione)

**Interfacce:**
- Consuma: `PassportDetailHost.openStage` (Task 4), `refreshProgress` (Task 3),
  `passportShortDate`, `stageName` (Task 2).
- Produce: `WmPassportStageDetailComponent`, selettore `wm-passport-stage-detail`, input
  `stage: PassportStage`, `layerTitle: string`, `host: {back(): Promise<void>}`. Classi CSS con
  prefisso `wm-passport-stage-detail` (`.wm-passport-stage` è già delle righe del dettaglio, con
  `ViewEncapsulation.None`).

- [ ] **Passo 1: test che falliscono:**
  - pagina con tappa `completed`: `chipLabel` è «percorsa il 30 set» (data dalla fixture), con
    icona ✓;
  - tappa `not_started`: «non ancora percorsa», senza data;
  - `distance 0` → `showDistance` false; `19.5` → true;
  - `openStage` due volte di fila spinge una sola pagina (stessa protezione di `openForm`);
  - badge: alla chiusura della modale (`onDidDismiss` finto risolto) chiama
    `refreshProgress(layerId)`.
- [ ] **Passo 2:** `npm run test:single`. Atteso: FALLISCONO.
- [ ] **Passo 3:** implementa:
  - la pagina, `OnPush`, `ion-header` con freccia indietro su `host.back()` e il titolo del
    cammino; nome della tappa con `stageName` nella lingua corrente; chip di stato con icona e
    testo, contrasto ≥ 4.5:1; riga «Distanza» come nel wireframe solo con `showDistance`. Niente
    «Condividi»;
  - `openStage(stage)` nella modale: `nav.push(WmPassportStageDetailComponent, {stage,
    layerTitle, host: this})`, con un flag `_openingStage` come `_openingForm`;
  - nel badge, dopo `modal.present()`: `modal.onDidDismiss().then(() =>
    this._passportSvc.refreshProgress(this.numericLayerId))`.
- [ ] **Passo 4:** `npm run test:single`. Atteso: PASS.

### Task 6: traduzioni

**File:**
- Modifica: `W/localization/i18n/{it,en,de,fr,es,pr,sq}.ts`

- [ ] **Passo 1:** per ogni testo nuovo cerca prima la chiave in `it.ts`, poi aggiungi in tutti e
  sette i file:
  - `'Nessuna tappa ancora riconosciuta'`
  - `'Impossibile caricare le tappe'`
  - `'percorsa il {{date}}'`
  - `'non ancora percorsa'`
  - `'Distanza'` (se non esiste già come testo: oggi c'è solo la chiave `'distance'`)
  Togli `'Nessuna tappa registrata via GPS'` e `'Le tappe riconosciute sono elencate nell\'email che ti abbiamo inviato.'`
  solo se nessun altro template li usa (`grep -rn` in `W`).
- [ ] **Passo 2:** `npm run test:single` e, da `core/` dell'app, `npx ng build`. Atteso: PASS e
  build senza errori di `strictTemplates`.
- [ ] **Passo 3 (dev): commit in wm-core**

  ```bash
  git -C wm-core add projects/wm-core/src/passport projects/wm-core/src/wm-core.module.ts \
    projects/wm-core/src/localization/i18n \
    docs/features/8676-passaporto-camminatore-tappe-percorse-e-validate-dellutente/
  git -C wm-core diff --cached --name-only
  git -C wm-core commit -m "feat(oc:8676): tappe validate reali nel passaporto e pagina della tappa"
  ```

### Task 7: prova a mano e puntatori

- [ ] **Passo 1:** con il backend camminiditalia locale avviato (`127.0.0.1:8000`) e le due
  modifiche locali degli `environment.ts` già presenti, `npm start` da `core/` con la configuration
  `camminiditalia`. Login con l'utente di test indicato dal dev. Verifica sul Cammino Grande di
  Celestino (layer 40): badge «46% · 6/13», dettaglio con le tappe in ordine «Tappa 01 … 12», date
  «30 set», tocco su una tappa → pagina con chip e distanza (nascosta dove è 0), «←» torna al
  dettaglio. Sul layer 63: «0 di 3 tappe» e «Nessuna tappa ancora riconosciuta». Backend spento
  con il dettaglio chiuso, poi riaperto: badge e dettaglio restano sull'ultimo valore. App appena
  aperta con backend spento: badge nascosto, dettaglio con «Impossibile caricare le tappe».
- [ ] **Passo 2 (dev): puntatori nell'app**

  ```bash
  git add core/src/app/shared/wm-core core/src/app/shared/wm-types
  git diff --cached --name-only   # solo i due submodule, niente environment.ts
  git commit -m "chore(oc:8676): aggiorna wm-core e wm-types con le tappe validate del passaporto"
  ```
