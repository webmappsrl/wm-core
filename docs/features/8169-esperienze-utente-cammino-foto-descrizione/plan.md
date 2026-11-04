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


### Ciclo 2, aggiunte 7-10 — piano

> Ticket: oc:8169 — overview: sezione «Ciclo 2, aggiunte» di overview.md

**Vincoli comuni**
- Tutto solo camminiditalia: varianti con `fileReplacements` (`core/angular.json`, configuration
  `camminiditalia`; la serve la eredita via `buildTarget`) o servizi avviati da
  `tabs.page.camminiditalia.ts`. Nessun controllo sullo shard nel codice condiviso.
- i18n wm-core: chiave = testo italiano, 7 lingue (de, en, es, fr, it, pr, sq). Testi dell'app in
  `core/src/assets/i18n`.
- Spec nuovi: aggiungerli a `core/tsconfig.spec.json` e ad `architect.test.options.include` di
  `core/angular.json`.
- Test frontend: `cd core && npx ng test --karma-config <scratchpad>/karma.local.cjs` con Node 22.
  Backend: `docker exec laravel-camminiditalia php artisan test --filter=<Test>`, poi `composer
  format` e PHPStan.
- Nessun commit automatico: i commit indicati sono per il dev (`feat(oc:8169): …`).

**Ordine**: Task 1 profilo → Task 2-3 valutazioni → Task 4 notifica → Task 5-6 scheda dati.

---

#### Task 1 — Tab «Il mio diario» nel profilo (app)

**File**
- Crea `core/src/app/pages/profile/profile-routing.module.camminiditalia.ts`: come quello condiviso
  più la figlia `{path: 'diary', component: ProfileDiaryTabComponent}`.
- Crea `core/src/app/pages/profile/tabs/profile-diary-tab/profile-diary-tab.component.{ts,html,scss}`
  (standalone, selettore `webmapp-profile-diary-tab`).
- Modifica `core/src/app/pages/profile/profile.page.camminiditalia.html`: «I tuoi dati» → «I miei
  dati», secondo `ion-tab-button` `tab="diary"` → `/profile/diary`, «Il mio diario».
- Modifica `core/angular.json`: sostituzione `profile-routing.module.ts` →
  `profile-routing.module.camminiditalia.ts` nella configuration `camminiditalia`.
- i18n app: «I miei dati», «Il mio diario», «Non hai ancora scritto nessun diario».

**Interfacce**
- Consuma `DiaryService` (elenco dei diari dell'utente, già usato da `wm-diaries-section`), lo
  store `ecTracks`/layer per il nome del cammino.
- Produce `ProfileDiaryTabComponent` con `groups$: Observable<{layerId: number; title: string}[]>`:
  un gruppo per `layerId` distinto dei diari dell'utente, in ordine di diario più recente.

**Passi**
1. Spec `profile-diary-tab.component.spec.ts`: con diari su layer 3 e 5 → due gruppi, il più recente
   primo; senza diari → il messaggio vuoto; ogni gruppo rende una `wm-diaries-section` con
   `layout="list"` e `showCreate=false`. Eseguirlo e vederlo fallire.
2. Implementare il componente e il routing; eseguire lo spec, poi la build `--configuration=camminiditalia`
   e quella di default (la default non deve includere il tab).
3. Commit: `feat(oc:8169): tab «Il mio diario» nel profilo camminiditalia`.

---

#### Task 2 — Valutazioni, backend (camminiditalia)

**File**
- Modifica `database/migrations/2026_10_20_100000_create_diaries_table.php`: `rating_route`,
  `rating_hospitality`, `rating_difficulty` `unsignedTinyInteger()->nullable()`. La migration non è
  mai andata in produzione: in sviluppo `migrate:rollback --step=2 && migrate` (mai `migrate:fresh`).
- `app/Models/Diary.php`: fillable e cast `integer`.
- Request Store e Update: `nullable|integer|between:1,5` per i tre campi; in Update `''`/`null`
  azzera.
- Risorsa/serializzazione del `DiaryController`: i tre campi nella risposta.
- `app/Nova/Diary.php`: tre campi `Number` in sola lettura.

**Passi**
1. Test in `tests/Feature/Diary*Test`: creazione con valutazioni 1 e 5 salvate; 0 e 6 → 422;
   modifica con `null` azzera; risposta API con i tre campi. Eseguirli e vederli fallire.
2. Implementare; test verdi, `composer format`, PHPStan.
3. Commit: `feat(oc:8169): valutazioni del diario`.

---

#### Task 3 — Valutazioni, frontend (wm-core)

**File**
- `diaries/diary.model.ts`: `ratingRoute`, `ratingHospitality`, `ratingDifficulty` (`number | null`)
  in `Diary` e `DiaryDraft`; `diary.service.ts` li manda in `_toFormData` (stringa vuota per `null`)
  e li legge dalla risposta.
- Crea `diaries/diary-rating/diary-rating.component.{ts,html,scss}`: standalone,
  `wm-diary-rating`, `@Input() value: number | null`, `@Input() readonly = false`,
  `@Input() size: 'form' | 'small'`, `@Output() valueChange`. SVG del timbro con `txn-boot`
  (path copiato da `wm-package/resources/defaults/icons.json`), bordo tratteggiato solo in `form`.
- `diary-form`: tre righe dopo le foto («Cammino» o «Tappa» se c'è `ecTrackId`, «Ospitalità»,
  «Difficoltà percepita»); bozza e coda offline portano i valori.
- `diary-detail`: solo le valutazioni date, `size="small"`, `readonly`.
- i18n wm-core: «Valutazioni», «Cammino», «Tappa», «Ospitalità», «Difficoltà percepita».

**Animazione** (solo `readonly=false`, solo al tocco): con Web Animations sui timbri da 1 a N che
diventano pieni, uno ogni 60 ms, `scale(1.4) rotate(-12deg)` → `scale(0.9)` → `scale(1) rotate(0)`,
250 ms, `easing: cubic-bezier(.2,.8,.3,1.2)`; quelli oltre N tornano vuoti con dissolvenza di
120 ms. Nessuna animazione al primo render né con `prefers-reduced-motion: reduce`. Al termine
`animation.cancel()` per non lasciare stili sopra a quelli del template (trappola nota delle
animazioni Web Animations in `.claude/rules/avvisi-gps`).

**Passi**
1. Spec `diary-rating.component.spec.ts`: tocco sul 3 → emette 3; tocco sul 3 con valore 3 → emette
   `null`; `readonly` non emette; al primo render con valore 4 non parte nessuna animazione
   (spia su `Element.prototype.animate`); al tocco sul 4 partono 4 animazioni; con
   `matchMedia('(prefers-reduced-motion: reduce)')` vero nessuna. Spec del form: i valori arrivano a
   `_toFormData` e nella bozza. Spec del dettaglio: con solo `ratingHospitality` si vede una riga.
   Eseguirli e vederli fallire.
2. Implementare; spec verdi, suite intera.
3. Commit: `feat(oc:8169): valutazioni con timbro animato nel form del diario`.

---

#### Task 4 — Notifica di cammino completato (wm-core + app)

**File**
- Crea `passport/route-completed-notice.service.ts`: `RouteCompletedNoticeService` con
  `start(): void` (idempotente), che ascolta `PassportService.passportRoutes$()` filtrando
  `completed`. Visti salvati in localforage, istanza nuova `device/completedRoutesSeen`, chiave per
  utente (`u<id>`), valore `number[]` di layerId.
  - Prima lettura per un utente senza chiave: segna come visti tutti i completati, nessuna scheda.
  - Poi: per ogni completato non visto, uno alla volta, `ToastController.create` con
    `position: 'top'`, `duration: 0`, `swipeGesture: 'vertical'`, `cssClass: 'wm-route-completed-toast'`,
    titolo «Hai completato {{name}}!», testo «Guarda il traguardo e racconta il cammino nel
    diario», bottoni «Più tardi» e «Vai al traguardo» (naviga al dettaglio del Passaporto del
    cammino, rotta già usata dal tab Passaporto). Segna visto alla chiusura, in ogni modo.
- `core/src/app/pages/tabs/tabs.page.camminiditalia.ts`: `start()` accanto agli altri servizi.
- Stile in `_passport-theme.scss`: angoli arrotondati, ombra, icona del timbro.
- i18n wm-core per i tre testi.

**Passi**
1. Spec `route-completed-notice.service.spec.ts`: prima esecuzione con due completati → nessun
   toast, visti salvati; un cammino nuovo completato → un toast; due nuovi → il secondo dopo la
   chiusura del primo; «Vai al traguardo» naviga; utente diverso → visti separati; logout → nessun
   toast. Eseguirli e vederli fallire.
2. Implementare; spec verdi, suite intera, build camminiditalia.
3. Commit: `feat(oc:8169): avviso di cammino completato`.

---

#### Task 5 — Scheda dati, backend (camminiditalia)

**File**
- `app/Services/StageProgressService.php`, `progressFor()`:
  - per tappa `user_distance`: km (arrotondati a 0,1) della somma
    `ST_Length(ugc_tracks.geometry::geography)/1000` delle tracce in `passport_stage_ugc_track` della
    sua `passport_stage`, **solo se** nessuna di quelle tracce è collegata ad altre `passport_stage`
    dell'utente; altrimenti `null`. Una query sola per tutte le tappe del cammino (niente N+1).
  - per tappa `walked_dates: string[]` (`Y-m-d`, ordinate, distinte): se ha tracce, la data di
    inizio di ciascuna (orario di inizio nelle `properties` della traccia se presente, altrimenti
    `created_at`), nel fuso `Europe/Rome`; se è validata da una richiesta cartacea
    (`certification_request_id`), ogni giorno da `start_date` a `end_date`; altrimenti `[]`. Le
    richieste caricate con una query sola.
  - nella risposta `user_distance_total`: somma delle tracce distinte collegate alle tappe validate
    del cammino + `distance` delle tappe validate senza tracce; `null` se nessuna tappa validata.

**Passi**
1. Test in `tests/Feature/StageProgress*Test`: tappa con una traccia propria → `user_distance` dalla
   geometria e `walked_dates` col suo giorno; traccia condivisa da due tappe → `user_distance`
   `null` su entrambe, nel totale contata una volta; tappa da richiesta cartacea dal 2026-05-01 al
   2026-05-03 → `user_distance` `null`, tre date; tappa validata senza tracce né richiesta → `[]`.
   Eseguirli e vederli fallire.
2. Implementare; test verdi, `composer format`, PHPStan.
3. Commit: `feat(oc:8169): km dell'utente nel progresso e date della certificazione`.

---

#### Task 6 — Scheda dati, frontend (wm-core)

**File**
- `passport.service.ts`: `userDistance?: number | null` e `walkedDates?: string[]` in
  `PassportStage` (da `user_distance`, `walked_dates`), `userDistanceTotal?: number | null` in
  `PassportProgress`. I tipi stanno in `@wm-types/passport` (submodule wm-types).
- Crea in `diaries/diary-route-data.utils.ts`:
  `diaryRouteData(progress: PassportProgress, diary: Diary): {km: number | null; from: string | null; to: string | null; days: number | null} | null`
  - diario di tappa: `null` se la tappa non è `completed`; km = `userDistance ?? distance`; date e
    giorni da `walkedDates` (vuoto → assenti).
  - diario del cammino: `null` se il cammino non è completato; km = `userDistanceTotal ??
    totalDistanceKm(stages)`; date e giorni dall'unione dei `walkedDates` di tutte le tappe, solo
    se nessuna tappa ha `walkedDates` vuoto, altrimenti assenti.
- `diary-detail`: blocco «Il tuo percorso» con le righe presenti, km con `passportKm`.
- i18n wm-core: «Il tuo percorso», «km», «giorni», «dal {{from}} al {{to}}».

**Passi**
1. Spec `diary-route-data.utils.spec.ts` con le fixture di `passport-progress.fixtures.ts`: tappa
   GPS con `userDistance` 12,3 e `distance` 14 → 12,3 e la sua data; tappa cartacea con tre date →
   14 km, tre giorni; tappa non completata → `null`; cammino con tappe GPS e cartacee →
   `userDistanceTotal`, giorni distinti dell'unione, prima e ultima data; una tappa senza date →
   giorni e date assenti, km presenti; cammino non completato → `null`; backend vecchio senza i
   campi nuovi → lunghezza del cammino, nessuna data. Eseguirli e
   vederli fallire.
2. Implementare; spec verdi, suite intera, build camminiditalia e default, build della webapp
   camminiditalia.
3. Commit: `feat(oc:8169): scheda dati del percorso nel diario`.

---

**Chiusura**: docs (sezioni del ciclo 2 in overview, plan, notes; knowledge page 8169), puntatori
dei submodule nell'app e nella webapp, review del branch intero, poi aggiornamento di oc:8169.

---

#### Task 7 — Profilo riorganizzato (app, solo camminiditalia)

**File**
- Crea `core/src/app/services/logout.service.ts`: `LogoutService.confirmLogout(): Promise<boolean>`
  con l'alert di oggi (avviso dei diari in coda compreso); `true` se l'utente ha confermato e il
  logout è partito. `SettingsComponent.logout()` lo usa e poi chiude la modale.
- `SettingsComponent`: `@Input() showLogout = true`; la voce «Esci» solo se `showLogout`.
- Crea `core/src/app/pages/profile/tabs/profile-account-tab/` (componente non standalone in
  `ProfileAccountTabModule`, come il tab del diario): sezioni Download (`wm-profile-data`),
  Modifica consenso dati (`wm-privacy-agree-button`), Esci (solo da loggato), Elimina account
  (`wm-profile-delete-button`), nel flusso, con margini laterali e spazio per la safe area.
- `profile-routing.module.camminiditalia.ts`: figlie `diary` e `account`, `''` → `diary`.
- `profile.page.camminiditalia.html`: tab «Il mio diario» (solo loggato) e «Account»; tolti i due
  pulsanti fissi in fondo.
- `profile.page.camminiditalia.ts`: al logout naviga a `/profile/account`; da non loggato,
  entrando in `/profile/diary`, va ad `account`; l'ingranaggio apre `SettingsComponent` con
  `showLogout: false`.
- i18n app: «Account», «Download», «Esci».

**Passi**
1. Spec `logout.service.spec.ts`: senza diari in coda il messaggio è quello base; con 2 diari in
   coda aggiunge l'avviso; conferma → `loadSignOuts` e `true`; annulla → nessuna azione e `false`.
   Spec `profile-account-tab.component.spec.ts`: da loggato quattro sezioni in quest'ordine; da non
   loggato solo i download; «Esci» chiama `confirmLogout`. Eseguirli e vederli fallire.
2. Implementare; spec verdi, suite intera, build camminiditalia e default (la default deve avere
   ancora «Esci» nell'ingranaggio).
3. Commit: `feat(oc:8169): profilo camminiditalia con le tab Il mio diario e Account`.


## Ciclo 3 — Editor del racconto — piano (4 novembre 2026)

> Ticket: oc:8169 — spec: sezione «Ciclo 3 — Editor del racconto» di overview.md

> **Per chi esegue:** superpowers:executing-plans, task per task, passi a checkbox. **Webmapp:** nessun
> `git commit`, `git add`, `git push` o branch durante l'esecuzione; i passi «Commit» sono istruzioni
> per il dev, dopo il review-gate.

**Goal:** racconto del diario scritto con un editor formattato (Tiptap), salvato come HTML ripulito e
mostrato uguale nel dettaglio.

**Architecture:** il backend camminiditalia ripulisce e misura `description` in un servizio sul
purifier di wm-package, prima della validazione; `description` è sempre HTML (una migration converte
i diari vecchi). In wm-core l'editor `wm-diary-editor` produce l'HTML, le utils del testo danno
estratti e conteggi, il dettaglio mostra l'HTML con lo stesso foglio di stile.

**Tech Stack:** Laravel 11 + Nova 5 + HTMLPurifier 4.19 (via wm-package), Angular 20 + Ionic 8 +
Tiptap 3.32.0, Karma/Jasmine, PHPUnit in Docker.

### Global Constraints

- Tag ammessi: `p`, `br`, `strong`, `em`, `s`, `h2`, `h3`, `ul`, `ol`, `li`, `blockquote`, `hr`,
  `a[href]` con schema `http`, `https`, `mailto`; i link relativi perdono il tag e tengono il testo.
- Limiti: 20.000 caratteri di testo visibile, 100.000 di HTML.
- `description` è sempre HTML: nessuna regola di riconoscimento del formato, né in PHP né in TS.
- Barra: 12 bottoni in quest'ordine — grassetto, corsivo, barrato, titolo (h2), sottotitolo (h3),
  elenco puntato, elenco numerato, citazione, collegamento, linea, annulla, ripeti.
- i18n wm-core: chiave = testo italiano, 7 file (de, en, es, fr, it, pr, sq); backend: chiave
  inglese in `resources/lang/*.json`.
- Tiptap 3.32.0 bloccato, in app e webapp.
- Comandi: backend `docker exec laravel-camminiditalia php artisan test --filter=<Test>`, poi
  `docker exec laravel-camminiditalia composer format` e PHPStan; frontend da `core/` con Node 22:
  `npx ng test --karma-config <scratchpad>/karma.local.cjs --watch=false --include=<cartella>`.

### Review Focus

1. Testo incollato da Word o da una pagina web con colori, caratteri e immagini → resta solo la
   formattazione ammessa (test nel Task 4).
2. Collegamento scritto `www.camminiditalia.it` o `camminiditalia.it/x` → salvato come
   `https://…` e aperto nel browser (Task 4 e 5).
3. Tocco su una parola in grassetto dentro un collegamento nel dettaglio → si apre il browser, l'app
   resta dov'è (Task 5).
4. Racconto con `&`, `<`, emoji e virgolette → nel dettaglio e negli estratti appare com'è scritto,
   senza `&amp;` (Task 1 e 3).
5. Editor che contiene solo paragrafi vuoti o spazi, con zero foto → «Scrivi un testo o aggiungi
   almeno una foto», sia nell'app sia nel backend (Task 2 e 4).

---

### Task 1: Pulizia e misura del testo del diario (camminiditalia)

**Files:**
- Create: `app/Services/DiaryTextService.php`
- Test: `tests/Unit/DiaryTextServiceTest.php`
- Modify: `composer.json` (`"ezyang/htmlpurifier": "^4.19"` fra i require), `composer.lock`

**Interfaces:**
- Produces: `DiaryTextService::clean(?string $text): ?string` (HTML ripulito, `null` se non resta
  testo visibile), `DiaryTextService::visibleLength(string $html): int` (caratteri, `mb_strlen`),
  `DiaryTextService::plainText(string $html): string` (blocchi separati da spazio, entità decodificate),
  costanti `MAX_VISIBLE = 20000`, `MAX_HTML = 100000`.

- [ ] **Step 1: test che falliscono** — `DiaryTextServiceTest`:
  `clean('<p>Ciao <strong>tu</strong></p>')` resta uguale; `<script>`, `onclick`, `style`, `<img>`,
  `<u>`, `<span>` spariscono e il loro testo resta; `<a href="javascript:alert(1)">x</a>` e
  `<a href="/rel">x</a>` diventano `x`; `<a href="https://a.it">x</a>` resta; testo senza tag
  `"Primo\n\nSecondo & <ciao>"` diventa `<p>Primo</p><p>Secondo &amp; &lt;ciao&gt;</p>`;
  `clean('<p></p><p> </p>')` è `null`; `visibleLength('<p>a &amp; b</p>')` è 5;
  `plainText('<h2>Giorno 1</h2><p>Via</p>')` è `'Giorno 1 Via'`.
- [ ] **Step 2:** `docker exec laravel-camminiditalia php artisan test --filter=DiaryTextServiceTest`
  → FAIL (classe assente).
- [ ] **Step 3:** implementa. Purifier da
  `HasEmbeddableRichText::buildRichTextPurifier(<tag ammessi>, '%^$%')` (nessun iframe), tenuto in
  una proprietà statica. Testo senza `<` → paragrafi su righe vuote, `\n` → `<br>`, con
  `htmlspecialchars` prima del purifier. Dopo il purifier, `<a>` con `href` non assoluto si
  sostituisce col suo contenuto (DOMDocument). `null` se `visibleLength` è 0.
- [ ] **Step 4:** stesso comando → PASS; `composer format`.
- [ ] **Step 5 (dev):** commit con Task 2 e 3.

### Task 2: Validazione e salvataggio (camminiditalia)

**Files:**
- Modify: `app/Http/Requests/StoreDiaryRequest.php`, `app/Http/Requests/UpdateDiaryRequest.php`,
  `resources/lang/{it,en,de,es,fr}.json`
- Test: `tests/Feature/DiaryApiTest.php`

**Interfaces:**
- Consumes: `DiaryTextService` del Task 1.

- [ ] **Step 1: test che falliscono** in `DiaryApiTest`: POST con
  `description = '<p>Ciao</p><script>x</script>'` salva `<p>Ciao</p>`; testo semplice salvato in
  paragrafi; 20.001 caratteri visibili in un `<p>` → 422 su `description` con «The story can be at
  most 20,000 characters long.»; 20.000 visibili → 201; HTML oltre 100.000 con testo sotto il limite
  (`<p><strong><em>a</em></strong></p>` ripetuto 4.000 volte: 104.000 caratteri di HTML, 4.000
  visibili) → 422 con «The story is too long.»; `'<p></p>'` senza foto → 422 «Write a text or add at least one
  photo.»; PUT con gli stessi casi.
- [ ] **Step 2:** `--filter=DiaryApiTest` → FAIL.
- [ ] **Step 3:** in entrambe le richieste `prepareForValidation()` sostituisce `description` con
  `DiaryTextService::clean()` se la chiave è presente; regola `max:100000` col messaggio «The story
  is too long.»; in `after()` il limite dei 20.000 con `visibleLength()` e la regola testo-o-foto su
  `description !== null`. Messaggi tradotti in `resources/lang/*.json` (it: «Il racconto può avere
  al massimo 20.000 caratteri.», «Il racconto è troppo lungo.»).
- [ ] **Step 4:** `--filter=DiaryApiTest` → PASS; tutta la suite `php artisan test` verde.

### Task 3: Migration dei diari esistenti e Nova (camminiditalia)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-3--nessuna-migration-di-conversione)

**Files:**
- Create: `database/migrations/2026_11_04_100000_convert_diary_descriptions_to_html.php`
- Modify: `app/Nova/Diary.php`
- Test: `tests/Feature/DiaryDescriptionMigrationTest.php`

**Interfaces:**
- Consumes: `DiaryTextService::clean()`, `plainText()`.

- [ ] **Step 1: test che fallisce** — un diario con `description = "Riga\n\nAltra & co"` scritto
  direttamente nel DB; eseguita la migration (`require` del file e `->up()`), diventa
  `<p>Riga</p><p>Altra &amp; co</p>`; un diario già HTML (`<p>x</p>`) non cambia.
- [ ] **Step 2:** `--filter=DiaryDescriptionMigrationTest` → FAIL.
- [ ] **Step 3:** la migration scorre i diari a blocchi (`chunkById`) e salva `clean()` solo se il
  valore cambia, senza toccare `updated_at` (`saveQuietly` con `timestamps = false` o query
  builder). `down()` vuoto con un commento: la conversione non si annulla.
- [ ] **Step 4:** Nova: nel dettaglio `Textarea` diventa un campo con
  `->displayUsing(fn ($v) => app(DiaryTextService::class)->clean($v))->asHtml()`, solo dettaglio;
  nell'elenco un `Text` con `plainText()` troncato a 80 caratteri; `applySearch()` sovrascritto:
  `id` uguale oppure
  `regexp_replace(description, '<[^>]+>', ' ', 'g') ILIKE ?`; tolto `description` da `$search`.
- [ ] **Step 5:** test → PASS; `php artisan migrate` sul DB di sviluppo (7 diari) e controllo in
  Nova; suite completa, `composer format`, PHPStan.
- [ ] **Step 6 (dev):** commit `feat(oc:8169): racconto del diario in HTML ripulito, limiti e Nova`.

### Task 4: Testo del diario ed editor (wm-core)

**Files:**
- Modify: `diaries/diary-text.utils.ts`, `diaries/diary-text.utils.spec.ts`,
  `diaries/diary-editor/diary-editor.component.{ts,html,scss}`, `diaries/_diary-rich-text.scss`
- Create: `diaries/diary-editor/diary-editor.component.spec.ts`

**Interfaces:**
- Produces in `diary-text.utils.ts` (togliere `isRichDiaryText` e `diaryTextToHtml`):
  `trimDiaryHtml(html: string): string`, `diaryTextExcerpt(html: string | null | undefined): string`,
  `diaryVisibleLength(html: string | null | undefined): number`,
  `diaryPlainText(html: string | null | undefined): string` (blocchi separati da riga vuota, per la
  casella di ripiego), `normalizeDiaryLink(url: string): string | null` (`null` se vuoto o con schema
  non ammesso), costanti `DIARY_MAX_VISIBLE = 20000`.
- Produces in `WmDiaryEditorComponent`: input `value`, `placeholder`, `inputId`; output
  `valueChange: EventEmitter<string>` (HTML senza paragrafi vuoti finali, `''` se vuoto) e
  `lengthChange: EventEmitter<number>` (testo visibile); proprietà `fallback: boolean`.

- [ ] **Step 1: test che falliscono.** Utils: `normalizeDiaryLink('www.a.it')` →
  `'https://www.a.it'`; `'mailto:x@y.it'` resta; `'javascript:alert(1)'` → `null`; `'  '` → `null`;
  `diaryVisibleLength('<p>a &amp; b</p>')` → 5; `diaryPlainText('<h2>A</h2><p>B</p>')` → `'A\n\nB'`;
  estratto con `&amp;` → `&`. Editor (fixture con `LangService` e `AlertController` finti): dopo il
  caricamento ci sono 12 bottoni con `aria-label` nell'ordine dei Global Constraints e nessuno
  «Sottolineato»; `value = '<p>Ciao</p>'` → l'area contiene «Ciao»; il comando sottolineato non è
  registrato (`editor.can().toggleUnderline` assente o falso); incollare
  `<p style="color:red"><span>x</span><img src="a.png"></p>` → `valueChange` emette `<p>x</p>`;
  con l'import di Tiptap che fallisce (`spyOn` sul metodo `_loadTiptap`) → `fallback` vero e
  compare una `textarea` con `diaryPlainText(value)`, il cui input emette testo semplice.
- [ ] **Step 2:** `--include=src/app/shared/wm-core/projects/wm-core/src/diaries` → FAIL.
- [ ] **Step 3:** implementa. Il caricamento di Tiptap va in un metodo `protected _loadTiptap()` per
  poterlo far fallire nei test. `StarterKit.configure({underline: false, code: false, codeBlock:
  false, heading: {levels: [2, 3]}, link: {openOnClick: false, autolink: true, defaultProtocol:
  'https', protocols: ['mailto']}})`; il bottone collegamento usa `normalizeDiaryLink`, e con
  `null` non salva e richiede l'indirizzo. Barra `position: sticky; top: 0` con sfondo pieno,
  bottoni `min-width/height: 44px`, `aria-pressed` solo sugli stili, stato attivo con sfondo;
  area di scrittura a 16 px (in `_diary-rich-text.scss` per entrambi, editor e dettaglio).
- [ ] **Step 4:** stesso comando → PASS.

### Task 5: Form, dettaglio, estratti e testi (wm-core)

**Files:**
- Modify: `diaries/diary-form/diary-form.component.{ts,html,scss}`,
  `diaries/diary-detail/diary-detail.component.{ts,html}`, `diaries/diaries-section/*`,
  `localization/i18n/{de,en,es,fr,it,pr,sq}.ts`
- Test: `diary-form.component.spec.ts`, `diary-detail.component.spec.ts`,
  `diaries-section.component.spec.ts`

**Interfaces:**
- Consumes: `WmDiaryEditorComponent` (`valueChange`, `lengthChange`), utils del Task 4.

- [ ] **Step 1: test che falliscono.** Form: con `lengthChange` a 20.001 il contatore ha la classe
  `is-over`, compare «Il racconto può avere al massimo 20.000 caratteri» vicino al campo e il
  bottone di invio è disabilitato; a 18.000 (90%) il contatore ha `aria-live="polite"`, sotto no;
  testo vuoto e zero foto → invio disabilitato come oggi. Dettaglio: `description` HTML finisce in
  `.wm-diary-detail-text` così com'è (senza conversione); tocco su un `<strong>` dentro
  `<a href="https://a.it">` → `window.open('https://a.it', '_blank')` (spia) e `preventDefault`;
  `mailto:` → assegnazione a `location.href` tramite un metodo `_openMailto` spiato. Sezione:
  l'estratto di `<p>A &amp; B</p>` è «A & B».
- [ ] **Step 2:** test della cartella `diaries` → FAIL.
- [ ] **Step 3:** implementa. Contatore «{{n}} / {{max}}» sotto l'editor con `toLocaleString` della
  lingua; il dettaglio usa `diary.description` diretto in `[innerHTML]` e un `(click)` sul
  contenitore con `closest('a')`. Testi nuovi nei 7 file i18n: Grassetto, Corsivo, Barrato, Titolo,
  Sottotitolo, Elenco puntato, Elenco numerato, Citazione, Collegamento, Linea di separazione,
  Ripeti, Formattazione, Indirizzo del collegamento, «{{n}} / {{max}}», «Il racconto può avere al
  massimo 20.000 caratteri» (Annulla e Conferma esistono già: verificare).
- [ ] **Step 4:** test della cartella → PASS; suite completa dell'app verde.
- [ ] **Step 5 (dev):** commit wm-core `feat(oc:8169): editor del racconto con formattazione`.

### Task 6: Pacchetti, build e prova sul dispositivo (app e webapp)

**Files:**
- Modify: `core/package.json`, `core/package-lock.json` (app, già fatto nella prova: verificare le
  quattro versioni 3.32.0); `package.json`, `package-lock.json` della webapp.

- [ ] **Step 1:** webapp: `npm install --save-exact @tiptap/core@3.32.0 @tiptap/pm@3.32.0
  @tiptap/starter-kit@3.32.0 @tiptap/extensions@3.32.0` (Node 22). Non si aggiorna ancora il
  puntatore di wm-core nella webapp: si fa con il rilascio.
- [ ] **Step 2:** app: build `--configuration=camminiditalia` e default → entrambe compilano; il
  bundle iniziale (`main`) non contiene `ProseMirror` (`grep -c ProseMirror main*.js` → 0).
- [ ] **Step 3:** prova a schermo (server di sviluppo e Chrome headless con l'utente di prova):
  racconto lungo con tutti i 12 bottoni, collegamento `www…`, incolla con colori, salvataggio,
  dettaglio uguale, estratti, Nova.
- [ ] **Step 4:** prova sul dispositivo (iOS e Android, a cura del dev): barra attaccata in alto
  con la tastiera aperta, riga di scrittura non coperta, nessuno zoom al tocco, collegamento aperto
  nel browser.
- [ ] **Step 5 (dev):** commit app `feat(oc:8169): editor del racconto, pacchetti Tiptap e
  puntatore wm-core`; webapp `chore(oc:8169): pacchetti Tiptap per wm-core`.


## Ciclo 4 — Date di percorrenza del diario — piano (4 novembre 2026)

> Ticket: oc:8169 — spec: sezione «Ciclo 4 — Date di percorrenza del diario» di overview.md

> **Per chi esegue:** superpowers:executing-plans, task per task. **Webmapp:** nessun commit, add,
> push o branch durante l'esecuzione; i passi «Commit» sono istruzioni per il dev.

**Goal:** date di percorrenza nel diario con un calendario a intervallo, collegamento delle
registrazioni sul periodo delle date (ultima percorrenza o date scritte, ±1 giorno).

**Architecture:** nel backend un helper delle percorrenze (raggruppa i giorni, tiene l'ultima) usato
da `StageProgressService` e da `DiaryUgcLinkService`, e un helper unico per il giorno di una
registrazione; nel diario due colonne di data. In wm-core un componente `wm-date-range-picker`
(stato e testi in funzioni pure), usato dal form del diario e da quello della richiesta cartacea.

### Global Constraints

- Percorrenze: due giorni a più di 30 giorni di distanza sono percorrenze diverse; si usa la più
  recente. Margine del collegamento: 1 giorno prima e dopo.
- Precedenza del periodo: date scritte nel diario → ultima percorrenza nota → 30 giorni (metodo
  attuale, invariato).
- Date sempre stringhe `AAAA-MM-GG`; «oggi» nel fuso `Europe/Rome`.
- Il diario salva date proprie solo se il campo è stato toccato; un campo svuotato invia valori vuoti.
- Form della richiesta cartacea: payload invariato (`start_date`, `end_date` entrambe obbligatorie;
  un giorno solo le rende uguali).
- i18n wm-core: chiave = testo italiano, 7 lingue; backend: `it.json`.
- Colonne nella migration di creazione `2026_10_20_100000_create_diaries_table.php`; database locale
  allineato a mano con `Schema::table`; database dei test con `migrate:fresh --env=testing`.

### Review Focus

1. Stessa tappa percorsa a maggio 2024 e maggio 2026 → date note, scheda e collegamento solo del 2026
   (Task 1 e 3).
2. Intervallo scelto toccando due volte lo stesso giorno → un giorno, senza stato sfasato (Task 4).
3. Diario scritto alle 00:30 italiane con «oggi» → accettato (Task 2).
4. Diario aperto in modifica senza date proprie e salvato senza toccare il campo → nessuna data
   salvata (Task 6).
5. Richiesta cartacea di un solo giorno → `start_date` = `end_date`, testo «Solo il …» visibile
   prima della conferma (Task 4 e 5).

---

### Task 1: Percorrenze e giorno di una registrazione (camminiditalia)

**Files:**
- Create: `app/Support/WalkPeriods.php`, `app/Support/UgcRecordingDate.php`
- Modify: `app/Services/StageProgressService.php` (`walkedData`, `recordingDate` → helper)
- Test: `tests/Unit/Support/WalkPeriodsTest.php`, `tests/Feature/StageProgressServiceTest.php`

**Interfaces:**
- Produces: `WalkPeriods::latest(array $dates): array` (giorni `Y-m-d` dell'ultima percorrenza,
  ordinati; gap > 30 giorni separa), `WalkPeriods::GAP_DAYS = 30`;
  `UgcRecordingDate::day(?string $firstPointMs, ?string $createdProp, ?string $createdAt): ?string`
  (primo punto, poi `createdAt`, poi la riga; fuso di Roma).

- [ ] **Step 1:** test che falliscono: `latest(['2024-05-10','2026-05-10','2026-05-11'])` →
  `['2026-05-10','2026-05-11']`; `latest(['2026-04-01','2026-05-01'])` (30 giorni) → entrambe;
  `latest([])` → `[]`; in `StageProgressServiceTest` una tappa con due registrazioni a due anni di
  distanza ha `walked_dates` solo dell'ultima.
- [ ] **Step 2:** `--filter='WalkPeriodsTest|StageProgressServiceTest'` → FAIL.
- [ ] **Step 3:** implementa; in `walkedData` le date di ogni tappa passano da `WalkPeriods::latest`;
  `recordingDate` delega a `UgcRecordingDate::day`.
- [ ] **Step 4:** stesso comando → PASS.

### Task 2: Date nel diario (camminiditalia)

**Files:**
- Modify: `database/migrations/2026_10_20_100000_create_diaries_table.php` (`walk_start_date`,
  `walk_end_date` `date` nullable), `app/Models/Diary.php` (fillable, cast `date:Y-m-d`,
  `toApiArray`), `Store/UpdateDiaryRequest`, `DiaryController`, `DiaryService`, `app/Nova/Diary.php`,
  `resources/lang/it.json`
- Test: `tests/Feature/DiaryApiTest.php`

**Interfaces:**
- Produces: API `walk_start_date`, `walk_end_date` (`Y-m-d` o `null`), in ingresso facoltative
  (`sometimes|nullable|date_format:Y-m-d`), `walk_end_date` ≥ `walk_start_date`; nessuna data dopo
  «oggi» a Roma (`today('Europe/Rome')`). Assenti in modifica = invariate; vuote = tolte.

- [ ] **Step 1:** test che falliscono: crea con le due date → salvate e restituite; solo l'inizio →
  fine `null`; fine prima dell'inizio → 422; domani (Roma) → 422; oggi a Roma con l'orologio fermo
  alle 23:30 UTC del giorno prima (`Carbon::setTestNow`) → 201; modifica senza le chiavi → date
  invariate; modifica con chiavi vuote → `null`.
- [ ] **Step 2:** `--filter=DiaryApiTest` → FAIL.
- [ ] **Step 3:** implementa; database locale con `Schema::table`, test con
  `migrate:fresh --env=testing`; Nova: due `Date` in sola lettura, nascosti dall'elenco.
- [ ] **Step 4:** → PASS.

### Task 3: Collegamento sul periodo delle date (camminiditalia)

**Files:**
- Modify: `app/Services/DiaryUgcLinkService.php`
- Test: `tests/Feature/DiaryUgcLinkServiceTest.php` (esistente o nuovo, secondo la cartella)

**Interfaces:**
- Consumes: `WalkPeriods::latest`, `UgcRecordingDate::day`, `StageProgressService::progressFor`
  (per le `walked_dates` della tappa o di tutte le tappe del cammino).

- [ ] **Step 1:** test che falliscono: con `walk_start_date`/`walk_end_date` si legano solo le
  registrazioni nel periodo ±1 giorno (una del giorno prima sì, due giorni prima no), anche se
  successive alla creazione del diario; senza date scritte e con due percorrenze (2024 e 2026) si
  legano solo quelle del 2026; senza nessuna data vale il metodo dei 30 giorni (test esistenti verdi);
  una registrazione delle 00:30 italiane conta per quel giorno.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** `resolveUgcTrackIds`: candidate come oggi; periodo = date scritte, altrimenti
  `WalkPeriods::latest` delle `walked_dates` (della tappa o unite su tutte le tappe), ±1 giorno;
  altrimenti il ramo attuale. Giorno di ogni candidata con `UgcRecordingDate::day`.
- [ ] **Step 4:** → PASS; suite completa, `composer format`, PHPStan.
- [ ] **Step 5 (dev):** commit `feat(oc:8169): date di percorrenza del diario e collegamento sul periodo`.

### Task 4: Calendario a intervallo (wm-core)

**Files:**
- Create: `shared/date-range-picker/date-range-picker.component.{ts,html,scss,spec.ts}`,
  `shared/date-range-picker/date-range.utils.ts` (+ spec)
- Modify: `shared/shared.module.ts` (dichiarazione ed export), i18n

**Interfaces:**
- Produces: `interface DateRange { start: string; end: string }`;
  `nextRange(current: DateRange | null, picking: 'start' | 'end', day: string): {range: DateRange; picking: 'start' | 'end'}`
  (primo tocco inizio, secondo fine con scambio se prima, stesso giorno = un giorno, terzo ricomincia);
  `daysBetween(range: DateRange): string[]`; `formatDateRange(range: DateRange | null, locale: string): string`
  («10 – 12 maggio 2026», «30 aprile – 2 maggio 2026», «30 dicembre 2025 – 2 gennaio 2026»,
  «10 maggio 2026»); `describeDateRange(range, locale)` per il testo sotto il calendario
  («Dal 10 al 12 maggio», «Solo il 10 maggio»).
  Componente `wm-date-range-picker`: input `value: DateRange | null`, `max: string`, `label`,
  `placeholder`, `invalid`, `clearable`; output `valueChange: EventEmitter<DateRange | null>`.
  `ion-datetime` con `[multiple]="true"`: a ogni `ionChange` si ricava il giorno toccato confrontando
  il nuovo array col precedente, si applica `nextRange`, si reimposta il valore ai soli estremi e si
  colorano i giorni in mezzo con `highlightedDates`.

- [ ] **Step 1:** test che falliscono delle utils (sequenze di tocchi, scambio, stesso giorno,
  ricomincia, formati nei tre casi e giorno singolo) e del componente (campo che apre il foglio,
  «Conferma» emette l'intervallo, «Annulla» no, svuota emette `null`, testo sotto il calendario).
- [ ] **Step 2:** `--include=…/shared/date-range-picker` (aggiungere la cartella agli elenchi degli
  spec se non è coperta da `shared`) → FAIL.
- [ ] **Step 3:** implementa; lingua da `intlLocale(langSvc.currentLang)`, `firstDayOfWeek` 1, `max`
  da passare; campo di almeno 44 px.
- [ ] **Step 4:** → PASS.

### Task 5: Richiesta cartacea con il calendario a intervallo (wm-core)

**Files:**
- Modify: `passport/passport-form/passport-form.component.{ts,html,scss,spec.ts}`

- [ ] **Step 1:** test che falliscono: scegliendo 10–12 maggio il payload ha `startDate`
  `2026-05-10` e `endDate` `2026-05-12`, come oggi; un giorno solo → le due date uguali; senza date
  l'invio resta bloccato con lo stesso messaggio di oggi; i due campi separati non ci sono più.
- [ ] **Step 2:** test del passaporto → FAIL.
- [ ] **Step 3:** sostituisce i due bottoni e la modale con `wm-date-range-picker`, che scrive nei
  due `FormControl` esistenti; toglie `openCalendar`/`confirmDate`/`pendingDate` non più usati.
- [ ] **Step 4:** → PASS.

### Task 6: Date nel diario: form, invio, dettaglio (wm-core)

**Files:**
- Modify: `diaries/diary.model.ts`, `diary.service.ts`, `diary-draft.store.ts`,
  `diary-outbox.service.ts`, `diary-form/*`, `diary-route-data.utils.ts`, `diary-detail/*`,
  `diaries-section` (riapertura di un non inviato), i18n
- Test: gli spec corrispondenti

**Interfaces:**
- Produces: `Diary.walkDates?: DateRange | null`; `DiaryDraft.walkDates?: DateRange | null` dove
  `undefined` = campo non toccato (non si invia) e `null` = svuotato (si inviano vuote);
  `diaryKnownWalk(progress, ecTrackId | null): DateRange | null` (date della tappa o unite su tutte
  le tappe, ultima percorrenza con gap 30 giorni, come nel backend).

- [ ] **Step 1:** test che falliscono: il servizio invia `walk_start_date`/`walk_end_date` solo con
  `walkDates` definito (vuote con `null`) e li legge dall'API; bozza e coda li conservano (anche nella
  riapertura di un non inviato); il form precompila dall'ultima percorrenza un campo non toccato e non
  sovrascrive un campo toccato; con date proprie mostra quelle; avviso se le date non toccano l'ultima
  percorrenza entro un giorno; `diaryRouteData` usa le date del diario prima di quelle note e c'è
  anche a percorso non completato (senza km).
- [ ] **Step 2:** test della cartella `diaries` → FAIL.
- [ ] **Step 3:** implementa; campo «Quando l'hai percorso» dopo il racconto, `clearable`;
  testi nuovi nelle 7 lingue.
- [ ] **Step 4:** → PASS; suite completa dell'app.
- [ ] **Step 5 (dev):** commit wm-core `feat(oc:8169): date di percorrenza nel diario e calendario a intervallo`.

### Task 7: Verifica

- [ ] Build di produzione camminiditalia e default.
- [ ] Prova a schermo con l'utente di prova: diario nuovo con il campo precompilato, scelta di un
  intervallo, salvataggio, dettaglio, registrazioni legate; richiesta cartacea con un intervallo e con
  un giorno (payload nella rete del browser).
- [ ] Prova sul dispositivo (a cura del dev): calendario su iOS e Android.
- [ ] **Commit (dev):** app con il puntatore di wm-core.
