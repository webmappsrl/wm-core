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
