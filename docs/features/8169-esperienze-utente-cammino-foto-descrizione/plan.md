> Ticket: oc:8169

# Esperienze utente — piano frontend (wm-core + webmapp-app)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Nessun commit automatico.** Le righe «Commit» sono istruzioni per il dev.
>
> **Superato durante l'implementazione** (dettaglio in [notes.md](notes.md)):
> - il controllo «`shardName` che inizia per `camminiditalia`» (Global Constraints, Task 1 Step 1,
>   Task 5 Step 3): il blocco lo montano le varianti camminiditalia con il flag `showExperiences`,
>   e il service non guarda lo shard;
> - Task 5: `home-layer.component.html` di default non monta il blocco, solo la variante
>   camminiditalia; track-properties e ugc-track-properties hanno ora una classe base e una variante.

**Goal:** blocco «esperienze» montato su cammino, tappa, Passaporto viste 3 e 6, più form, dettaglio e sezione nella UGC track, contro l'API del piano backend.

**Architecture:** stato in un service con RxJS, sullo schema di `PassportService` (Subject di refresh + `shareReplay`), senza NgRx; componenti standalone in `experiences/`; il form si apre in una modale sulla mappa e con `nav.push` dentro la modale del Passaporto.

**Tech Stack:** Angular 20, Ionic 8, RxJS, NgRx (solo `isLogged`, `openLoginModal`, `ecLayer`, `currentEcTrack`).

**Spec:** `docs/features/8169-esperienze-utente-cammino-foto-descrizione/overview.md` + UI https://claude.ai/artifact/ET13SZH33ZZNbdA4jVDyoH

## Global Constraints

- Percorso base: `projects/wm-core/src/` (sotto `W/`); tipi in `W/experiences/experience.model.ts` (non in wm-types, per non toccare un quarto repo).
- API: `${this._environmentSvc.origin}/api/experiences…`; il token lo aggiunge `AuthInterceptor`.
- Attive solo con `shardName` che inizia per `camminiditalia` **e** risposta dell'API diversa da 404.
- `maxPhotos = 6`; `captureOptions = {maxWidth: 1600, quality: 80}`; `MAX_PHOTOS` invariato.
- Selettori e classi CSS con prefisso `wm-`; identificatori in inglese; commenti in italiano.
- Testi: chiave = testo italiano nei 7 file `W/localization/i18n/{de,en,es,fr,it,pr,sq}.ts`, cercare prima se il testo esiste già.
- Pulsanti: raggio 10 px, testo 700, colore `var(--wm-color-primary)`; scheda «Racconta…» tratteggiata 1.5px, raggio 12.
- Spec: si lanciano dall'app (`cd core && npm run test`) dopo il Task 0.

## Review Focus

- Utente non loggato tocca «Racconta…»: si apre il login, nessuna chiamata di creazione (Task 5).
- Logout con le esperienze già caricate: spariscono subito, anche dal blocco aperto (Task 1).
- Senza rete alla pubblicazione: errore nel form, testo e foto restano (Task 3).
- Togliere una foto già salvata in modifica non chiama `deleteUgcMedia` (Task 2).
- API spenta (404): nessun blocco visibile da nessuna parte (Task 4).

---

### Task 0 (repo webmapp-app): far girare gli spec di `experiences/`

**Files:** Modify: `core/angular.json:178-190` (`test.options.include`) e `core/tsconfig.spec.json:14-26` — aggiungere `src/app/shared/wm-core/projects/wm-core/src/experiences`.

- [ ] **Step 1:** aggiunta nei due elenchi (regola `test-unitari` dell'app).
- [ ] **Step 2:** `cd core && npm run test -- --watch=false` → nessuna regressione (Node 22).
- [ ] **Step 3: Commit (webmapp-app)** `test(oc:8169): spec delle esperienze nella suite dell'app`

### Task 1: Modello e service

**Files:**
- Create: `W/experiences/experience.model.ts`, `W/experiences/experience.service.ts`
- Test: `W/experiences/experience.service.spec.ts`

**Interfaces (Produces):**
```ts
export interface Experience { id: number; uuid: string; layer: {id: number; name: string};
  ecTrack: {id: number; name: string} | null; description: string | null;
  createdAt: string; updatedAt: string; photos: {id: number; url: string; thumbnail: string}[];
  ugcTrackIds: number[]; }
export type ExperiencesStatus = 'loading' | 'active' | 'login-required' | 'off';
export interface ExperienceFilter { layerId?: number; ecTrackId?: number; ugcTrackId?: number; scope?: 'mine' | 'all'; }
export interface ExperienceDraft { uuid: string; layerId?: number; ecTrackId?: number;
  description: string; newPhotos: Blob[]; keepMediaIds?: number[]; }
```
`ExperienceService` (`providedIn: 'root'`):
- `status$(): Observable<ExperiencesStatus>` — `off` se lo shard non è camminiditalia senza chiamare l'API; altrimenti `GET /api/experiences`: 200 → `active`, 401 → `login-required`, 404 → `off`; rilegge al cambio di `isLogged`.
- `experiences$(filter: ExperienceFilter): Observable<Experience[]>` — filtra un unico stream condiviso (`shareReplay`) per cammino (stesso `layer.id`, tappe comprese), tappa o registrazione; `scope` ignorato se `'mine'` (unico supportato ora).
- `create(draft): Observable<Experience>`, `update(id, draft): Observable<Experience>`, `remove(id): Observable<void>` — ognuno chiama `refresh()` alla fine.
- `refresh(): void`; al logout lo stream emette `[]`.
- FormData: `uuid`, `layer_id`, `ec_track_id`, `description`, `images[]`, e in modifica `keep_media_ids` come `JSON.stringify(ids)` sempre presente.

- [ ] **Step 1: test** con `HttpTestingController`: `status è off fuori da camminiditalia senza chiamate`; `401 → login-required`; `404 → off`; `experiences$ del cammino include le tappe`; `update invia keep_media_ids "[]" quando vuoto`; `logout svuota le esperienze`.
- [ ] **Step 2:** `npm run test` → FAIL. **Step 3:** implementazione. **Step 4:** → PASS.
- [ ] **Step 5: Commit** `feat(oc:8169): service delle esperienze`

### Task 2: Picker, rimozione solo dal form

**Files:** Modify: `W/image-picker/image-picker.component.ts:25-28,100-103`.

**Interfaces:** `@Input() removeMode: 'ugc' | 'local' = 'ugc'`; `@Output() syncedPhotoRemoved = new EventEmitter<number>()`. Con `'local'`, `remove()` su una foto con `id` la toglie dalla lista ed emette l'id, senza `deleteUgcMedia`. I 6 lettori attuali non cambiano.

- [ ] **Step 1: test** `removeMode local non dispatcha deleteUgcMedia ed emette l'id`; `removeMode ugc invariato`.
- [ ] **Step 2–4:** FAIL → implementazione → PASS.
- [ ] **Step 5: Commit** `feat(oc:8169): picker con rimozione solo locale`

### Task 3: Form di creazione e modifica

**Files:** Create: `W/experiences/experience-form/experience-form.component.{ts,html,scss,spec.ts}`

**Interfaces:**
- Selettore `wm-experience-form`; input `layerId?: number`, `ecTrackId?: number`, `contextLabel: string`, `experience?: Experience`, `host?: {back(): void}`.
- Implementa `PassportLeaveGuard` (`canLeave(): Promise<boolean>`: se testo o foto non vuoti, alert «Vuoi uscire?» / «Il testo e le foto non pubblicati andranno persi.» con «Esci» e «Continua a scrivere»).
- `uuid` generato una volta all'apertura (creazione) e riusato ai nuovi invii.
- «Pubblica» (creazione) / «Salva» (modifica) disabilitato se `description.trim()` vuoto e nessuna foto.
- Errore di rete: messaggio «Nessuna connessione. Il tuo racconto e le foto restano qui: riprova quando sei online.», form aperto.
- Picker: `maxPhotos=6`, `captureOptions` dei Global Constraints, `removeMode='local'`, foto salvate da `experience.photos`.

- [ ] **Step 1: test** `pubblica disabilitato con solo spazi`; `stesso uuid su due invii`; `errore di rete mantiene testo`; `canLeave chiede conferma con testo presente`; `in modifica invia keepMediaIds senza la foto tolta`.
- [ ] **Step 2–4:** FAIL → implementazione come nell'artifact (schermate «Form» e «Form: senza rete e uscita») → PASS.
- [ ] **Step 5: Commit** `feat(oc:8169): form delle esperienze`

### Task 4: Blocco «esperienze» e dettaglio

**Files:**
- Create: `W/experiences/experiences-section/experiences-section.component.{ts,html,scss,spec.ts}`
- Create: `W/experiences/experience-detail/experience-detail.component.{ts,html,scss}`
- Create: `W/experiences/experience-launcher.service.ts`

**Interfaces:**
- `wm-experiences-section`: input `layerId: number`, `ecTrackId?: number`, `ugcTrackId?: number`, `layout: 'carousel' | 'list'`, `title: string`, `nav?: IonNav` (dentro il Passaporto), `hideWhenEmpty = false`, `showCreate = true`. Non rende nulla se lo stato è `off`; con `login-required` mostra solo la scheda «Racconta…».
- `ExperienceLauncherService`: `openForm(opts: {layerId?: number; ecTrackId?: number; contextLabel: string; experience?: Experience; nav?: IonNav}): Promise<void>` — non loggato → `store.dispatch(openLoginModal())` e basta; con `nav` → `nav.push(WmExperienceFormComponent, …)`; altrimenti `ModalController`. `openDetail(experience, nav?)` allo stesso modo.
- Dettaglio: galleria foto, etichette cammino e tappa, data, «visibile solo a te», riga «Collegata alla tua registrazione del …» se `ugcTrackIds` non vuoto, «Modifica» (apre il form) ed «Elimina» (alert di conferma, poi `remove`).

- [ ] **Step 1: test** `status off non rende nulla`; `login-required mostra solo la scheda Racconta`; `tocco da non loggato dispatcha openLoginModal`; `carousel del cammino mostra TAPPA o CAMMINO`; `hideWhenEmpty nasconde a zero`.
- [ ] **Step 2–4:** FAIL → implementazione come nell'artifact → PASS.
- [ ] **Step 5: Commit** `feat(oc:8169): blocco e dettaglio delle esperienze`

### Task 5: Montaggio nei cinque punti

**Files:**
- Modify: `W/home/home-layer/home-layer.component.html:27` e `home-layer.component.camminiditalia.html:40` — dopo `wm-config-detail`: `layout="carousel"`, titolo «Le tue esperienze», `layerId` da `layer$` (`home-layer-base.component.ts:28`). Le due righe identiche nei due template.
- Modify: `W/track-properties/track-properties.component.html` dopo `wm-config-detail` — `layout="list"`, titolo «Le tue esperienze su questa tappa», `ecTrackId` da `ecTrack$`, `layerId` da `currentLayer$`.
- Modify: `W/passport/passport-stage-detail/passport-stage-detail.component.html` in fondo — `layout="list"`, `nav` della modale.
- Modify: `W/passport/passport-detail/passport-detail.component.html` dopo `wm-passport-detail-share` — `layout="carousel"`, titolo «Le tue esperienze», `nav`.
- Modify: `W/passport/passport-modal/passport-modal.component.ts` — espone `nav` ai figli tramite `host` (come `openForm`, righe 92-96); il form registrato con `registerGuard` (riga 196).
- Modify: `W/ugc-track-properties/ugc-track-properties.component.html:49` — dopo `wm-feature-useful-urls`: `ugcTrackId`, titolo «Esperienze collegate», `hideWhenEmpty`, `showCreate=false`.

- [ ] **Step 1:** montaggi.
- [ ] **Step 2:** `npm start` con `shardName: 'camminiditaliadev'`, backend locale: verificare a mano le 5 schermate rispetto all'artifact, da loggato e da non loggato; conteggio della variante: `curl -s http://localhost:8123/main.js | grep -c wm-experiences-section` > 0.
- [ ] **Step 3:** stessa app con un altro shard: nessun blocco, nessuna chiamata a `/api/experiences` nella scheda Network.
- [ ] **Step 4: Commit** `feat(oc:8169): esperienze su cammino, tappa, passaporto e registrazioni`

### Task 6: Traduzioni

**Files:** Modify: `W/localization/i18n/{de,en,es,fr,it,pr,sq}.ts`.

Testi: «Le tue esperienze», «Le tue esperienze su questa tappa», «Racconta la tua esperienza», «Racconta questa tappa», «Esperienze collegate», «Nuova esperienza», «Modifica esperienza», «Il tuo racconto», «Foto», «Pubblica», «Salva», «Per ora l'esperienza la vedi solo tu.», «visibile solo a te», «Collegata alla tua registrazione del {{date}}», «Vuoi uscire?», «Il testo e le foto non pubblicati andranno persi.», «Esci», «Continua a scrivere», «Nessuna connessione. Il tuo racconto e le foto restano qui: riprova quando sei online.», «Eliminare questa esperienza?», «Elimina», «Modifica», «Riprova».

- [ ] **Step 1:** `grep` di ogni testo nei 7 file; aggiungere solo quelli mancanti.
- [ ] **Step 2:** `npm run build` nell'app senza errori di chiavi duplicate.
- [ ] **Step 3: Commit** `feat(oc:8169): traduzioni delle esperienze`

### Task 7 (repo webmapp-app): puntatore del submodule

- [ ] **Step 1:** dopo il merge di wm-core, `git -C core/src/app/shared/wm-core checkout develop && git pull`; il puntatore nell'app aggiornato.
- [ ] **Step 2: Commit (webmapp-app)** `chore(oc:8169): aggiorna wm-core con le esperienze`


## Ciclo 2 — «Il mio diario» (3 novembre 2026)

### Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Webmapp:** nessun `git commit`, `git add`, `git push` o creazione di branch durante l'esecuzione. I passi «Commit» sono istruzioni testuali per il dev, eseguite solo dopo il review-gate.

**Goal:** rinominare la funzione in «diario» ovunque e aggiungere consenso, visibilità Nova solo admin, diario del cammino nel Passaporto a cammino iniziato, bozza e coda offline, pulsante solo vicino al cammino.

**Architecture:** backend Laravel (`camminiditalia`) per modello, API, Nova; libreria Angular `wm-core` per componenti e servizi, montata dall'app (`webmapp-app`) e dalla webapp. I servizi che devono girare sempre (coda, cammino attivo) si avviano dalla variante `tabs.page.camminiditalia.ts` dell'app, già in `fileReplacements`.

**Tech Stack:** Laravel 11 + Nova + PHPUnit (Docker), Angular 20 + Ionic 8 + NgRx + localforage + OpenLayers, Karma/Jasmine.

**Spec:** `overview.md` del cantiere, sezione «Ciclo 2 — «Il mio diario»» (bozza in `scratchpad/overview-ciclo2.md`).

## Global Constraints

- Ordine vincolante dei task: rinomino → consenso e Nova → Passaporto → bozza e coda → cammino attivo. Il rinomino o è completo o non si fa.
- Nome in codice: `Diary` / `diaries` / `diary_ugc_track` / `/api/diaries` / `DiaryService` / cartella `diaries/` / selettori `wm-diary-*` / flag `showDiaries`.
- i18n wm-core: chiave = testo italiano, ripetuto come valore in `it.ts`; 7 lingue: de, en, es, fr, it, pr, sq. Nessuna chiave duplicata nello stesso file.
- Nuovi selettori e classi CSS con prefisso `wm-`; identificatori in inglese; commenti e docs in italiano; JSDoc su funzioni e metodi.
- Costanti: soglia vicinanza `DIARY_PROXIMITY_METERS = 1000`; durata cammino attivo e scadenza bozze/coda `DIARY_RETENTION_DAYS = 90`; attese dei tentativi `DIARY_OUTBOX_BACKOFF_MINUTES = [1, 5, 15]`; throttle della posizione `DIARY_PROXIMITY_THROTTLE_MS = 180000`.
- Testo del consenso, esatto: «Cammini d'Italia può pubblicare il mio racconto sui suoi canali».
- Commit: `refactor(oc:8169): …` per il rinomino, `feat(oc:8169): …` per il resto; un commit per repo per task.
- Backend: comandi in `docker exec laravel-camminiditalia …`; dopo aver cambiato una migration già eseguita: `php artisan migrate:fresh` e `php artisan migrate:fresh --env=testing`.

## Review Focus

1. Utente A con un diario in coda, logout, login di B con rete → il diario di A non parte (resta in attesa di A).
2. Invio dalla coda che riceve 422 → il diario resta come «Non inviato» e si riapre nel form con testo, foto e messaggio; nessun nuovo tentativo automatico.
3. Rete che torna mentre un invio è in corso → un solo POST in volo per uuid, nessun doppione.
4. Posizione a 600 m da una tappa ma fuori dal `bbox` di nessun cammino diverso → solo quel cammino diventa attivo; senza rete e senza tappe in cache vale l'esito del `bbox`.
5. Bozza della tappa 3 aperta dopo quella della tappa 4 → ognuna ritrova il proprio testo.

---

### Task 0: Allineamento dei branch e del database locale

**Files:** nessun file di codice.

- [ ] **Step 1:** in `wm-core` (`core/src/app/shared/wm-core`) `git checkout feature/oc-8169-esperienze-modello-dedicato` (oggi è in detached HEAD su `e8fe1866`; la cartella non tracciata `docs/features/descrizione-troncata-a-righe-intere/` resta e non va toccata).
- [ ] **Step 2:** in `camminiditalia` `git checkout feature/oc-8169-esperienze-modello-dedicato` e `git submodule update --init wm-package` (vedi oc:8719).
- [ ] **Step 3:** nell'app, il dev decide come mettere da parte le modifiche locali del branch oc:8892 (`core/src/environments/environment.ts`, puntatore di `wm-types`) prima del `git checkout feature/oc-8169-esperienze-modello-dedicato`. **Chiedere al dev, non eseguire in autonomia.**
- [ ] **Step 4:** in `wm-webapp` il branch è già quello giusto, con 4 modifiche locali: chiedere al dev cosa sono prima di toccare il repo.
- [ ] **Step 5:** verifica: `docker exec laravel-camminiditalia php artisan test --filter=Experience` → tutto PASS (base di partenza).

### Task 1: Rinomino nel backend (Experience → Diary)

**Files (camminiditalia):** rinomina con `git mv` e aggiorna contenuti:
- `app/Models/Experience.php` → `app/Models/Diary.php` (tabella `diaries`, relazione `ugcTracks` su `diary_ugc_track`, costante `MAX_PHOTOS` invariata)
- `app/Policies/ExperiencePolicy.php` → `DiaryPolicy.php`; registrazione in `app/Providers/AppServiceProvider.php` (anche il rate limiter `experiences` → `diaries`)
- `app/Http/Controllers/Api/ExperienceController.php` → `DiaryController.php`; `app/Http/Requests/{Store,Update}ExperienceRequest.php` → `{Store,Update}DiaryRequest.php`
- `app/Http/Middleware/EnsureExperiencesEnabled.php` → `EnsureDiariesEnabled.php`; `ProtectExperienceMedia.php` → `ProtectDiaryMedia.php`
- `app/Jobs/LinkExperienceUgcTracksJob.php` → `LinkDiaryUgcTracksJob.php`; `app/Services/ExperienceService.php` → `DiaryService.php`; `ExperienceUgcLinkService.php` → `DiaryUgcLinkService.php`
- `app/Observers/ExperienceCleanupObserver.php` → `DiaryCleanupObserver.php`; `app/Nova/Experience.php` → `app/Nova/Diary.php`; riferimenti in `app/Nova/Media.php`, `app/Providers/NovaServiceProvider.php`
- `routes/api.php`: prefisso `diaries`, nome `camminiditalia.api.diaries.`, parametro `{diary}`
- `config/camminiditalia.php`: chiave `diaries` con `enabled` ← `env('CAMMINIDITALIA_DIARIES_ENABLED', true)` e `ugc_link_window_days` ← `env('CAMMINIDITALIA_DIARY_LINK_DAYS', 30)`
- migration `2026_10_20_100000_create_experiences_table.php` → `…_create_diaries_table.php`, `2026_10_20_100100_create_experience_ugc_track_table.php` → `…_create_diary_ugc_track_table.php` (colonna `experience_id` → `diary_id`)
- `database/factories/ExperienceFactory.php` → `DiaryFactory.php`; `resources/lang/it.json` (etichette Nova: «Diario», «Diari»)
- `tests/Feature/Experience*Test.php` → `Diary*Test.php` (7 file)
- **Non toccare:** `database/migrations/2025_03_31_120623_create_apps_table.php`, `resources/views/welcome.blade.php` (contengono «experience» in altro senso).

**Interfaces — Produces:** `App\Models\Diary`, rotte `GET|POST /api/diaries`, `POST|DELETE /api/diaries/{diary}`, config `camminiditalia.diaries.*`.

- [ ] **Step 1:** rinomina file e simboli come sopra.
- [ ] **Step 2:** `git grep -n -i "experience" -- app config routes database tests resources/lang` → nessun risultato, tranne i due file esclusi.
- [ ] **Step 3:** `docker exec laravel-camminiditalia php artisan migrate:fresh` e `… migrate:fresh --env=testing`.
- [ ] **Step 4:** `docker exec laravel-camminiditalia php artisan test --filter=Diary` → PASS; poi suite completa → PASS.
- [ ] **Step 5:** `docker exec laravel-camminiditalia composer format`.
- [ ] **Step 6 (dev):** segnalare nel `notes.md` le variabili d'ambiente rinominate (`CAMMINIDITALIA_DIARIES_ENABLED`, `CAMMINIDITALIA_DIARY_LINK_DAYS`) da aggiornare negli ambienti.
- [ ] **Step 7 (commit, dev):** `refactor(oc:8169): rinomina experience in diary nel backend`.

### Task 2: Rinomino in wm-core, nell'app e nei testi (7 lingue)

**Files (wm-core, `projects/wm-core/src/`):**
- `experiences/` → `diaries/`: `experience.model.ts` → `diary.model.ts` (`Diary`, `DiaryDraft`, `DiaryFilter`, `DiariesStatus`), `experience.service.ts` → `diary.service.ts` (`DiaryService`, URL `/api/diaries`), `experience-launcher.service.ts` → `diary-launcher.service.ts`, `experience-offline.utils.ts` → `diary-offline.utils.ts`, `experience-photo.utils.ts` → `diary-photo.utils.ts`, componenti `experience-form` → `diary-form` (`wm-diary-form`), `experience-detail` → `diary-detail` (`wm-diary-detail`), `experiences-section` → `diaries-section` (`wm-diaries-section`); spec rinominati insieme.
- `track-properties*` e `ugc-track-properties*`: flag `showExperiences` → `showDiaries`.
- `home/home-layer/home-layer.component.camminiditalia.html`, `passport/passport-detail/…html`, `passport/passport-stage-detail/…html`: tag e titoli.
- `utils/localForage.ts`: `synchronizedExperiences` → `synchronizedDiaries` (`storeName: 'diaries'`), `clearExperiencesCache` → `clearDiariesCache`; `store/auth/auth.effects.ts`; `services/camera.service.ts`; `wm-core.module.ts`.
- `localization/i18n/{de,en,es,fr,it,pr,sq}.ts`: sostituire le 34 chiavi (it.ts righe 405-438) con le nuove. Nuovi testi italiani:
  - «Il mio diario» (era «Le tue esperienze»); «Il mio diario di questa tappa» («Le tue esperienze su questa tappa»); «Diari collegati» («Esperienze collegate»); «Racconta il tuo cammino» («Racconta la tua esperienza»); «Nuova pagina di diario» («Nuova esperienza»); «Modifica il diario» («Modifica esperienza»); «Eliminare questa pagina di diario?» («Eliminare questa esperienza?»); «Il tuo diario non è disponibile senza connessione.» («Le tue esperienze non sono disponibili senza connessione.»); «Il diario non è disponibile senza connessione.» («Le esperienze non sono disponibili senza connessione.»); «Non è stato possibile aggiornare il diario.» («Non è stato possibile aggiornare le esperienze.»). Le altre chiavi senza «esperienz» restano.
**Files (app):** `core/angular.json:198` e `core/tsconfig.spec.json:26` → `…/src/diaries`.

**Interfaces — Produces:** `DiaryService` con `create(draft: DiaryDraft): Observable<Diary>`, `update(id: number, draft: DiaryDraft): Observable<Diary>`, `remove(id: number): Observable<void>`, `refresh(): void`; componente `wm-diaries-section` con gli stessi input di oggi (`layerId`, `ecTrackId`, `ugcTrackId`, `layout`, `title`, `contextLabel`, `nav`, `guardHost`, `hideWhenEmpty`, `showCreate`, `carouselInset`).

- [ ] **Step 1:** rinomina file e simboli; aggiorna i 7 file di lingua.
- [ ] **Step 2:** `git grep -n -i "experienc" -- projects/wm-core/src` → nessun risultato; nell'app `git grep -n "experiences" -- core/angular.json core/tsconfig.spec.json` → nessun risultato.
- [ ] **Step 3:** dall'app `cd core && npm run test` → PASS, e il numero di spec eseguiti non diminuisce rispetto a prima del rinomino.
- [ ] **Step 4:** dall'app `npx ng build --configuration=camminiditalia` → build riuscita.
- [ ] **Step 5 (commit, dev):** `refactor(oc:8169): rinomina experience in diary` in wm-core; nell'app `refactor(oc:8169): spec dei diari e puntatore di wm-core`.

### Task 3: Consenso e Nova solo per l'Administrator (backend)

**Files (camminiditalia):** migration `…_create_diaries_table.php` (colonna `publication_consent` boolean default false), `app/Models/Diary.php` (`$fillable`, `$casts`, `toApiArray()` con `publication_consent`; `scopeVisibleTo` e `isVisibleTo`: solo Administrator), `app/Policies/DiaryPolicy.php` (`viewAny`: solo Administrator), `app/Http/Requests/{Store,Update}DiaryRequest.php` (`'publication_consent' => ['sometimes', 'boolean']`), `app/Services/DiaryService.php` (passa il campo in creazione e modifica), `app/Nova/Diary.php` (`Boolean::make(__('Consenso alla pubblicazione'), 'publication_consent')->readonly()` + filtro), Create `app/Nova/Filters/DiaryPublicationConsentFilter.php`; test in `tests/Feature/DiaryApiTest.php`, `DiaryPolicyTest.php`, `DiaryModelTest.php`.

- [ ] **Step 1: test che falliscono**
  - `test_store_salva_publication_consent`: POST con `publication_consent=1` → 201, `json('data.publication_consent') === true`, riga con `true`.
  - `test_store_senza_consenso_vale_false`: POST senza campo → `false`.
  - `test_update_cambia_publication_consent`: da `false` a `true` → 200 e valore `true`.
  - `test_validator_non_vede_i_diari`: utente Validator proprietario del layer, diario `is_public=true` → `Diary::visibleTo($validator)->count() === 0` e `viewAny` → false.
  - `test_administrator_vede_tutti_i_diari`: invariato, resta PASS.
- [ ] **Step 2:** `docker exec laravel-camminiditalia php artisan test --filter=Diary` → FAIL sui nuovi test.
- [ ] **Step 3:** implementa come da elenco file; aggiorna i test esistenti del Validator (`DiaryPolicyTest`, `DiaryModelTest`) alla nuova regola.
- [ ] **Step 4:** `migrate:fresh` (dev e testing), poi test → PASS; `composer format`.
- [ ] **Step 5 (commit, dev):** `feat(oc:8169): consenso alla pubblicazione e diari visibili solo agli amministratori`.

### Task 4: Spunta del consenso nel form (wm-core)

**Files:** `diaries/diary.model.ts` (`Diary.publicationConsent: boolean`, `DiaryDraft.publicationConsent: boolean`), `diaries/diary.service.ts` (`_toFormData`: `form.append('publication_consent', draft.publicationConsent ? '1' : '0')` in creazione e modifica; mappatura `publication_consent` → `publicationConsent`), `diaries/diary-form/diary-form.component.{ts,html,scss}` (`ion-checkbox` con label visibile, `labelPlacement="end"`, area di tocco ≥ 44px, non selezionata di default, valorizzata in modifica), i18n: nuova chiave «Cammini d'Italia può pubblicare il mio racconto sui suoi canali» nelle 7 lingue.

- [ ] **Step 1: test che falliscono** in `diary.service.spec.ts`: `it('invia publication_consent=1 quando la spunta è attiva')`, `it('legge publicationConsent dalla risposta')`; in `diary-form.component.spec.ts`: `it('la spunta del consenso parte non selezionata')`, `it('in modifica ripropone il consenso salvato')`.
- [ ] **Step 2:** `npm run test` → FAIL.
- [ ] **Step 3:** implementa.
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5 (commit, dev):** `feat(oc:8169): spunta del consenso alla pubblicazione nel form del diario`.

### Task 5: Diario del cammino nel Passaporto a cammino iniziato

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-5--passaporto-a-cammino-iniziato)

**Files:** `passport/passport-detail/passport-detail.component.html` (oggi il blocco sta dentro `<ng-container *ngIf="vm.completed">`, riga 55), spec `passport-detail.component.spec.ts`.

- [ ] **Step 1: test che falliscono:** `it('mostra il diario del cammino con almeno una tappa riconosciuta')` (`completedStages: 1`, `completed: false` → `wm-diaries-section` presente); `it('non mostra il diario del cammino senza tappe riconosciute')` (`completedStages: 0` → assente); `it('a cammino completato il diario resta nel traguardo')`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** sposta `wm-diaries-section` fuori dal blocco del traguardo con `*ngIf="vm.completed || vm.progress?.completedStages > 0"`, mantenendo la posizione attuale quando il cammino è completato (sotto «Condividi il traguardo»).
- [ ] **Step 4:** PASS.
- [ ] **Step 5 (commit, dev):** `feat(oc:8169): diario del cammino nel passaporto da cammino iniziato`.

### Task 6: Bozza del form salvata sul telefono

**Files:** Create `diaries/diary-draft.store.ts` (+ spec); `utils/localForage.ts` (istanza `deviceDiaryDrafts`, `name: 'device'`, `storeName: 'diaryDrafts'`); `diaries/diary-form/diary-form.component.ts`.

**Interfaces — Produces:**
- `type DiaryDraftKey = string` costruita da `diaryDraftKey(userId: number, ctx: {layerId?: number; ecTrackId?: number; diaryId?: number}): DiaryDraftKey` → `"u<userId>:d<diaryId>"` in modifica, altrimenti `"u<userId>:l<layerId>:t<ecTrackId|0>"`.
- `interface StoredDiaryDraft { key: DiaryDraftKey; userId: number; uuid: string; layerId?: number; ecTrackId?: number; diaryId?: number; description: string; photos: Blob[]; keepMediaIds?: number[]; publicationConsent: boolean; updatedAt: number }`
- `class DiaryDraftStore` (`providedIn: 'root'`): `save(draft: StoredDiaryDraft): Promise<void>`, `load(key: DiaryDraftKey): Promise<StoredDiaryDraft | null>`, `remove(key: DiaryDraftKey): Promise<void>`, `purgeOlderThan(days: number, now?: number): Promise<number>`.

- [ ] **Step 1: test che falliscono** (`diary-draft.store.spec.ts`): `diaryDraftKey` per cammino, tappa e modifica dà tre chiavi diverse; `save` + `load` ritrovano testo, foto (Blob) e uuid; `purgeOlderThan(90)` cancella una bozza con `updatedAt` di 91 giorni fa e tiene quella di 89. In `diary-form.component.spec.ts`: alla riapertura nello stesso contesto il form ripropone testo e uuid salvati; dopo pubblicazione riuscita e dopo «esci senza pubblicare» la bozza è rimossa.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementa lo store; nel form: carica la bozza all'apertura (uuid della bozza al posto di quello nuovo), salva il testo con `debounceTime(800)`, salva subito su aggiunta/rimozione foto e cambio della spunta, rimuove la bozza a pubblicazione, annullamento esplicito e passaggio in coda (Task 7).
- [ ] **Step 4:** PASS.
- [ ] **Step 5 (commit, dev):** `feat(oc:8169): bozza del diario salvata sul telefono`.

### Task 7: Coda di invio offline per i diari nuovi

**Files:** Create `diaries/diary-outbox.service.ts` (+ spec); `utils/localForage.ts` (istanza `deviceDiaryOutbox`, `name: 'device'`, `storeName: 'diaryOutbox'`); `diaries/diary-form/diary-form.component.ts` (offline → accoda); `diaries/diaries-section/diaries-section.component.{ts,html}` (elementi in coda in testa alla lista); app `core/src/app/pages/tabs/tabs.page.camminiditalia.ts` (avvio) e `core/src/app/components/settings/settings.component.ts:148` (avviso al logout); wm-core `profile/profile-popup/profile-popup.component.ts:34` (stesso avviso); i18n 7 lingue.

**Interfaces — Consumes:** `DiaryService.create`, `DiaryDraftStore.remove`, selector `online`, `isLogged`, `userId` dallo store auth.
**Interfaces — Produces:**
- `interface DiaryOutboxItem { uuid: string; userId: number; layerId: number; ecTrackId?: number; description: string; photos: Blob[]; publicationConsent: boolean; status: 'pending' | 'failed'; errorMessage?: string; attempts: number; nextAttemptAt: number; updatedAt: number }`
- `class DiaryOutboxService` (`providedIn: 'root'`): `start(): void` (idempotente), `enqueue(draft: DiaryDraft, userId: number): Promise<void>`, `items$(filter: {layerId?: number; ecTrackId?: number}): Observable<DiaryOutboxItem[]>` (solo dell'utente corrente), `pendingCount(userId: number): Promise<number>`, `discard(uuid: string): Promise<void>`, `toDraft(item: DiaryOutboxItem): DiaryDraft`.
- Esiti dell'invio: 2xx → rimozione + `DiaryService.refresh()`; 401 → resta `pending`, riparte al login; status 0 o 5xx → `attempts++`, `nextAttemptAt` da `DIARY_OUTBOX_BACKOFF_MINUTES`, poi solo al ritorno della rete; 422, 413, 404 → `failed` con `errorMessage`. Un solo invio alla volta.
- Trigger: `start()` legge la coda; se vuota non crea timer. Invia su transizione `online` falso→vero, su login, allo scadere di `nextAttemptAt`. `start()` esegue anche `purgeOlderThan(DIARY_RETENTION_DAYS)` su coda e bozze.
- Testi nuovi (it): «In attesa di invio», «Non inviato», «Sei offline: il diario partirà appena torni online», «Hai {{n}} diari in attesa di invio: se esci, partiranno al tuo prossimo accesso».

- [ ] **Step 1: test che falliscono** (`diary-outbox.service.spec.ts`, con `fakeAsync` e `HttpTestingController`):
  - `it('al ritorno della rete invia il diario in coda con lo stesso uuid e lo rimuove')`
  - `it('non invia gli elementi di un altro utente')` (Review Focus 1)
  - `it('su 422 marca failed con il messaggio e non ritenta')` (Review Focus 2)
  - `it('su 500 ritenta dopo 1 e poi 5 minuti')`
  - `it('su 401 resta pending e riparte dopo il login')`
  - `it('con due eventi online ravvicinati fa un solo POST')` (Review Focus 3)
  - `it('a coda vuota start non crea timer')`
  - `it('purge rimuove elementi più vecchi di 90 giorni')`
  - In `diaries-section.component.spec.ts`: l'elemento `pending` mostra «In attesa di invio» in un elemento con `role="status"`; il `failed` mostra «Non inviato» e al tocco apre il form con `toDraft(item)`.
  - In `diary-form.component.spec.ts`: offline, «Pubblica» su un diario nuovo chiama `enqueue`, rimuove la bozza, chiude il form e mostra il toast; in modifica offline resta il comportamento attuale.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementa servizio, integrazione nel form e nella sezione; in `tabs.page.camminiditalia.ts` inietta `DiaryOutboxService` e chiama `start()` nel costruttore; al logout (`settings.component.ts`, `profile-popup.component.ts`) se `pendingCount(userId) > 0` aggiungi il testo dell'avviso alla conferma.
- [ ] **Step 4:** PASS; build `--configuration=camminiditalia` riuscita.
- [ ] **Step 5 (commit, dev):** wm-core `feat(oc:8169): coda di invio offline dei diari`; app `feat(oc:8169): avvio della coda dei diari e avviso al logout`.

### Task 8: Pulsante solo vicino al cammino (opzione B)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-8--pulsante-solo-vicino-al-cammino)

**Files:** Create `diaries/active-route.service.ts` (+ spec); `utils/localForage.ts` (istanza `deviceActiveRoutes`, `name: 'device'`, `storeName: 'activeRoutes'`, chiave `layerId`, valore `lastSeenAt`); `home/home-layer/home-layer.component.camminiditalia.{ts,html}` e `track-properties/track-properties.component.camminiditalia.ts` (+ template condiviso: `[showCreate]`); app `tabs.page.camminiditalia.ts` (avvio).

**Interfaces — Consumes:** `GeolocationService.onLocationChange$` (`WmLocation`), layer della configurazione con `bbox` e `tracks` (`Hit.id`), `EcService.getEcTrack(id): Observable<WmFeature<LineString>>`, `GeoutilsService` per la distanza punto-linea.
**Interfaces — Produces:** `class ActiveRouteService` (`providedIn: 'root'`): `start(): void` (idempotente), `isActive$(layerId: number): Observable<boolean>`, `checkNow(location: WmLocation): Promise<void>`; funzione pura `isNearLine(location: [number, number], line: LineString, meters: number): boolean`; funzione pura `bboxContains(bbox: number[], location: [number, number], marginMeters: number): boolean`.

- [ ] **Step 1: test che falliscono** (`active-route.service.spec.ts`):
  - `isNearLine` vero a 600 m da una linea, falso a 1.500 m;
  - `bboxContains` con margine di 1.000 m: vero appena fuori dal rettangolo, falso a 5 km;
  - `checkNow` con posizione a 600 m da una tappa del cammino A → `isActive$(A)` vero, `isActive$(B)` falso (Review Focus 4);
  - senza rete e `getEcTrack` in errore → vale l'esito del `bbox`;
  - `lastSeenAt` di 91 giorni fa → non attivo; di 89 → attivo;
  - due posizioni nello stesso intervallo di throttle → un solo controllo.
  - In `track-properties` e `home-layer` (varianti camminiditalia): con `isActive$` falso il pulsante non c'è ma i diari già scritti sì.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementa: `throttleTime(DIARY_PROXIMITY_THROTTLE_MS)` su `onLocationChange$`; filtro `bbox` su tutti i cammini; per i candidati carica le tappe con `getEcTrack` una alla volta, si ferma alla prima entro `DIARY_PROXIMITY_METERS`; salta i cammini già marcati oggi; controllo anche all'apertura del dettaglio se c'è una posizione. Nelle varianti camminiditalia passa `[showCreate]="isActive$ | async"` a `wm-diaries-section`. Nel Passaporto `showCreate` resta `true`. Avvio con `start()` nel costruttore di `tabs.page.camminiditalia.ts`.
- [ ] **Step 4:** PASS; build `--configuration=camminiditalia` riuscita.
- [ ] **Step 5 (commit, dev):** wm-core `feat(oc:8169): pulsante del diario solo vicino al cammino`; app `feat(oc:8169): avvio del controllo del cammino attivo`.

### Task 9: Puntatori, documentazione, verifica finale

- [ ] **Step 1:** aggiorna il puntatore di wm-core nell'app e nella webapp al commit finale di wm-core; in webapp `npx ng build --configuration=camminiditalia` riuscita.
- [ ] **Step 2:** aggiungi le sezioni «Ciclo 2» a `overview.md`, `plan.md`, `notes.md` del cantiere in wm-core e camminiditalia; aggiorna la pagina di conoscenza dei diari (oggi `docs/knowledge/8169-esperienze-utente-cammino-foto-descrizione.md`) e la frase superata sulla webapp.
- [ ] **Step 3:** suite backend completa → PASS; `npm run test` nell'app → PASS.
- [ ] **Step 4 (commit, dev):** `docs(oc:8169): ciclo 2 del diario` e puntatori.
