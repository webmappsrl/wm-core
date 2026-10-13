> Ticket: oc:8764

# Import tolto da camminiditalia e oggetto `import` nelle UGC — piano di implementazione

> **Per chi esegue con agenti:** sub-skill richiesta: `superpowers:subagent-driven-development`
> (consigliata) oppure `superpowers:executing-plans`, task per task. I passi usano le checkbox
> (`- [ ]`).

**Obiettivo:** togliere il bottone di import del box UGC solo per camminiditalia (app e webapp) e
scrivere un oggetto `import` nelle properties di ogni UGC importata da file, per tutte le app.

**Architettura:** una funzione pura in wm-core calcola `import` dal `File`, dal testo letto e
dalla feature convertita; l'uploader la chiama in `_handleFile` e scrive il risultato in
`upload()`, senza altri cambi al flusso. Il bottone sparisce con una variante
`ugc-box.component.camminiditalia.ts` applicata con `fileReplacements` nelle configuration
`camminiditalia` di webmapp-app e wm-webapp.

**Stack:** Angular 20, Ionic 8, NgRx 20, `@tmcw/togeojson` 6.0.1, Karma + Jasmine.

**Spec:** [overview.md](overview.md) (identica in webmapp-app, wm-core e wm-webapp).

## Vincoli globali

- **Nessun `git commit`, `git add`, `git push` né creazione di branch durante l'esecuzione.** I
  passi «Commit» qui sotto sono istruzioni per il dev, da eseguire solo dopo il suo via libera.
- Branch: `feature/oc-8764-tracce-importate-import-tolto-da-camminiditalia` da `Passaporto` in
  webmapp-app e wm-core; stesso nome da `develop` in wm-webapp. Commit con scope `oc:8764`.
- Il flusso dell'import (`modal-ugc-uploader`) resta com'è: lettura, conversione, scelta della
  prima geometria, riduzione a 2D dei POI, pulizia delle properties, salvataggio. Si aggiunge
  solo `import`.
- Nomi dei campi di `import`, esatti: `format`, `file_name`, `file_size`, `file_last_modified`,
  `creator`, `points`, `file_features`, `has_time`, `has_elevation`. Nessun `imported_at`, nessun
  `version`, nessun `origin`.
- Niente prefisso `I` sulle interfacce nuove; identificatori in inglese; commenti e JSDoc in
  italiano; JSDoc su funzioni e metodi.
- La variante duplica la logica dell'originale (niente classe base): selettore `wm-ugc-box`,
  classe `UgcBoxComponent`, template proprio.
- Nessun testo nuovo visibile, nessun tipo in wm-types da cambiare (`WmProperties` ha un index
  signature).

## Punti da guardare in review

1. **GeoJSON con una property `import` propria** (export dell'app reimportato): deve vincere
   quella calcolata. Coperto dal test `sovrascrive un import già presente nel file` (Task 1) e
   dall'ordine dello spread in `upload()` (Task 2).
2. **GPX con più `<trk>` e waypoint**: `points` conta la sola UGC salvata, `file_features` tutte
   le geometrie. Test `GPX con più tracce` (Task 1).
3. **POI importato**: niente `has_elevation`, `has_time` da `properties.time`. Test `POI GPX`
   (Task 1).
4. **File senza estensione riconosciuta o con conversione fallita**: l'uploader li scarta già
   prima; `buildUgcImportInfo` non viene chiamata e `_importInfo` resta quello del file valido
   precedente — va azzerato quando il file non è valido (Task 2, passo 2).
5. **Utente camminiditalia con privacy da accettare**: il bottone della privacy resta. Test
   `mostra ancora il bottone della privacy` (Task 3).

---

### Task 1: funzione `buildUgcImportInfo` (wm-core)

**File:**
- Crea: `projects/wm-core/src/utils/ugc-import-info.ts`
- Test: `projects/wm-core/src/utils/ugc-import-info.spec.ts`

**Interfacce:**
- Produce:
  ```ts
  export interface UgcImportInfo {
    format: 'gpx' | 'kml' | 'geojson';
    file_name: string;
    file_size: number;
    file_last_modified: string;   // ISO 8601
    creator?: string;             // solo GPX, solo se presente
    points: number;
    file_features: number;
    has_time: boolean;
    has_elevation?: boolean;      // solo LineString
  }
  export function buildUgcImportInfo(
    file: File,
    content: string,
    feature: WmFeature<LineString | Point>,
  ): UgcImportInfo;
  ```

- [ ] **Passo 1: scrivi gli spec che falliscono**

  Costruisci i `File` con `new File([content], name, {lastModified: Date.UTC(2026, 8, 30, 8, 12)})`
  e le feature con `toGeoJSON.gpx/kml` sullo stesso testo, prendendo la prima LineString (o il
  primo Point) come fa l'uploader. Casi e asserzioni:

  - `GPX con creator, orari e quote`: `<gpx creator="Garmin Connect">` con un `<trk>` di 3
    `<trkpt>` con `<ele>` e `<time>` → `format: 'gpx'`, `file_name`, `file_size: file.size`,
    `file_last_modified: '2026-09-30T08:12:00.000Z'`, `creator: 'Garmin Connect'`, `points: 3`,
    `file_features: 1`, `has_time: true`, `has_elevation: true`.
  - `GPX con più tracce`: due `<trk>` (3 e 2 punti) e un `<wpt>`, feature = prima traccia →
    `points: 3`, `file_features: 3`.
  - `GPX senza creator`: `creator` assente (`'creator' in info` è `false`).
  - `KML senza orari`: un `<LineString>` con coordinate `lon,lat,ele` → `format: 'kml'`,
    `has_time: false`, `has_elevation: true`, nessun `creator`.
  - `GeoJSON senza quote`: Feature LineString con coordinate 2D → `format: 'geojson'`,
    `file_features: 1`, `has_time: false`, `has_elevation: false`.
  - `GeoJSON esportato da traccia registrata`: `properties.locations` con `time` → `has_time: true`.
  - `POI GPX`: un `<wpt>` con `<ele>` e `<time>`, feature Point → `points: 1`, `has_time: true`,
    `'has_elevation' in info` è `false`.
  - `sovrascrive un import già presente nel file`: GeoJSON con `properties.import = {format: 'x'}`
    → il risultato ha `format: 'geojson'` (verifica sulla funzione; lo spread è in Task 2).

- [ ] **Passo 2: lancia gli spec e verifica che falliscano**

  Da `core/src/app/shared/wm-core`: `npm install` (se `node_modules` manca), poi
  `npx ng test wm-core --watch=false --include='**/ugc-import-info.spec.ts'`.
  Atteso: FAIL, modulo `./ugc-import-info` non trovato.

- [ ] **Passo 3: implementa `buildUgcImportInfo`**

  - `format` dall'estensione minuscola di `file.name`, come `_validateAndConvertToWmFeature`.
  - `file_last_modified`: `new Date(file.lastModified).toISOString()`.
  - `creator`: per `gpx`, `DOMParser` sul testo e `documentElement.getAttribute('creator')`;
    la chiave si aggiunge solo se il valore è non vuoto.
  - `file_features`: per `gpx`/`kml` `toGeoJSON.gpx|kml(doc).features.length`; per `geojson`
    sempre `1`.
  - `points`: `1` per un Point, `coordinates.length` per una LineString.
  - `has_time`: LineString → `coordinateProperties.times` non vuoto (array, anche annidato) oppure
    `locations` con almeno un elemento con `time`; Point → `properties.time` presente.
  - `has_elevation`: solo per LineString, `true` se almeno una coordinata ha il terzo valore
    numerico; per un Point la chiave non c'è.

- [ ] **Passo 4: lancia gli spec e verifica che passino**

  Stesso comando del passo 2. Atteso: tutti PASS.

- [ ] **Passo 5: commit (istruzione per il dev, solo dopo il via libera)**

  `feat(oc:8764): calcola l'oggetto import di una UGC importata da file`

---

### Task 2: `import` scritto dall'uploader (wm-core)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-import-scritto-dalluploader)

**File:**
- Modifica: `projects/wm-core/src/modal-ugc-uploader/modal-ugc-uploader.component.ts`
  (`_handleFile` righe ~238-252, `upload()` righe ~136-152)

**Interfacce:**
- Consuma: `buildUgcImportInfo(file, content, feature): UgcImportInfo` dal Task 1.

- [ ] **Passo 1: aggiungi il campo privato `_importInfo: UgcImportInfo | null = null`**, con JSDoc.

- [ ] **Passo 2: in `_handleFile`**, nel ramo `if (result)` dopo `ugcFeature$.next(result)`,
  assegna `this._importInfo = buildUgcImportInfo(file, fileContent, result)`; nei rami di errore
  (file non accettato, geometria non valida, errore di lettura) imposta `this._importInfo = null`.

- [ ] **Passo 3: in `upload()`**, aggiungi `...(this._importInfo && {import: this._importInfo})`
  all'oggetto `properties` (quello con `name`, `form`, `uuid`, …). Sta già dopo
  `...this.ugcFeature$.value?.properties` nello spread, quindi vince sull'eventuale `import` del
  file. Nient'altro cambia.

- [ ] **Passo 4: verifica di compilazione**

  Da `core/`: `npx ng build --configuration=development` (oppure `npm start` già acceso).
  Atteso: build senza errori.

- [ ] **Passo 5: commit (istruzione per il dev)**

  `feat(oc:8764): scrive l'oggetto import nelle properties delle UGC importate`

---

### Task 3: variante `ugc-box` camminiditalia (wm-core)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#decisioni)

**File:**
- Crea: `projects/wm-core/src/box/ugc-box/ugc-box.component.camminiditalia.ts`
- Crea: `projects/wm-core/src/box/ugc-box/ugc-box.component.camminiditalia.html`
- Test: `projects/wm-core/src/box/ugc-box/ugc-box.component.camminiditalia.spec.ts`

**Interfacce:**
- Produce: classe `UgcBoxComponent`, selettore `wm-ugc-box`, stessi input/output di
  `BaseBoxComponent<IUGCBOX>`; `templateUrl: './ugc-box.component.camminiditalia.html'`,
  `styleUrls: ['./ugc-box.component.scss']`.

- [ ] **Passo 1: scrivi lo spec che fallisce**

  TestBed con `declarations: [UgcBoxComponent, ...FAKE_BOX_PIPES]` (da
  `../box-template.spec-support`), `schemas: [NO_ERRORS_SCHEMA]`, provider `Store` finto
  (`select` → `of(true)` per `isLogged` e `ugcOpened`, `needsPrivacy$` per `needsPrivacyAgree`,
  `of(null)` per `confAPP`) e `LangService` finto (`onLangChange: of()`). Casi:
  - `non mostra il bottone di import con utente loggato e UGC aperto`:
    `querySelector('ion-button')` è `null`.
  - `mostra ancora il bottone della privacy`: con `needsPrivacy$` a `true`,
    `querySelector('wm-privacy-agree-button')` non è `null`.
  - `mostra il titolo «I miei percorsi»`: `.wm-box-title` contiene `I miei percorsi`.

- [ ] **Passo 2: lancia lo spec e verifica che fallisca**

  `npx ng test wm-core --watch=false --include='**/ugc-box.component.camminiditalia.spec.ts'`.
  Atteso: FAIL, file della variante mancante.

- [ ] **Passo 3: scrivi la variante**

  `.ts`: copia di `ugc-box.component.ts` senza `showUgcUploaderButton$`, `openUgcUploader()` e
  l'import di `openUgcUploader`; in testa un commento come quello di
  `search-box.component.camminiditalia.ts` (variante attivata con `fileReplacements`, oc:8764,
  template copia del default: una correzione al default va riportata a mano qui).
  `.html`: copia di `ugc-box.component.html` senza il blocco `<ion-button … openUgcUploader()>`.

- [ ] **Passo 4: lancia lo spec e verifica che passi**

  Stesso comando del passo 2. Atteso: PASS.

- [ ] **Passo 5: commit (istruzione per il dev)**

  `feat(oc:8764): variante camminiditalia del box UGC senza import`

---

### Task 4: suite di wm-core e pulizia (wm-core)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-4-suite-di-wm-core-e-pulizia)

- [ ] **Passo 1:** da `core/src/app/shared/wm-core`, `npm run test:single`. Atteso: tutta la suite
  verde, compresi i due spec nuovi.
- [ ] **Passo 2:** `rm -rf core/src/app/shared/wm-core/node_modules`, poi riavvia `ng serve`
  dell'app: con quella cartella l'app non compila (oc:8763).
- [ ] **Passo 3:** se il task lascia modifiche a `package-lock.json` di wm-core, ripristinalo.

---

### Task 5: `fileReplacements` nell'app (webmapp-app)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#decisioni)

**File:**
- Modifica: `core/angular.json` (configuration `build.camminiditalia.fileReplacements`, dopo la
  voce di `search-box`, riga ~130)

- [ ] **Passo 1:** aggiungi
  ```json
  {
    "replace": "src/app/shared/wm-core/projects/wm-core/src/box/ugc-box/ugc-box.component.ts",
    "with": "src/app/shared/wm-core/projects/wm-core/src/box/ugc-box/ugc-box.component.camminiditalia.ts"
  }
  ```
  Sotto `serve.camminiditalia` non serve nulla: usa `buildTarget: app:build:camminiditalia`.

- [ ] **Passo 2: verifica sulla build compilata**

  `environment.ts` su camminiditalia, poi **riavvio** di `npm start`. Atteso:
  `curl -s http://localhost:<porta>/main.js | grep -c cloud-upload-outline` → `0`
  (l'icona compare solo nel template originale del box). Con uno shard generico, dopo un nuovo
  riavvio, il conteggio è maggiore di zero. Se il box è in un chunk lazy, cerca su tutti i `.js`
  serviti.

- [ ] **Passo 3: verifiche a mano**
  - camminiditalia: «I miei percorsi» senza bottone di import, titolo e immagine al loro posto,
    click sul box che apre la lista;
  - shard generico: import di un GPX, traccia salvata e sincronizzata, `properties.import` sul
    server con i campi attesi.

- [ ] **Passo 4: commit (istruzione per il dev)**

  `feat(oc:8764): nasconde l'import del box UGC su camminiditalia`, insieme al puntatore del
  submodule wm-core aggiornato.

---

### Task 6: `fileReplacements` nella webapp (wm-webapp)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-6-filereplacements-nella-webapp)

**File:**
- Modifica: `angular.json` di wm-webapp (configuration `camminiditalia`, righe ~92-101)
- Modifica: puntatore del submodule `src/app/shared/wm-core`

- [ ] **Passo 1:** aggiorna il submodule wm-core a un commit che contiene la variante (il branch
  del Task 3, o il merge quando c'è).
- [ ] **Passo 2:** aggiungi la stessa voce del Task 5 con i path della webapp
  (`src/app/shared/wm-core/projects/wm-core/src/box/ugc-box/…`).
- [ ] **Passo 3:** build `camminiditalia` della webapp senza errori e box UGC senza bottone di
  import; stessa prova `grep -c cloud-upload-outline` sui `.js` serviti.
- [ ] **Passo 4: commit (istruzione per il dev)** — submodule e `angular.json` **nello stesso
  commit**: `feat(oc:8764): nasconde l'import del box UGC su camminiditalia`. Merge solo dopo
  quello di wm-core.

---

### Task 7: documentazione

- [ ] `notes.md` nei tre repo (deviazioni, decisioni: tag saltati, `file_name` tenuto, nessuna
  versione dentro `import`, titolo del ticket da cambiare).
- [ ] Conoscenza: in wm-core aggiornare `docs/knowledge/ugc.md` (oggetto `import`) e
  `docs/knowledge/varianti-per-shard.md` (nuova variante `ugc-box`); in wm-core la regola
  `varianti-e-classi-base.md` elenca i template copiati — aggiungere `ugc-box`. In webmapp-app
  aggiornare `docs/knowledge/temi-e-varianti-di-shard.md` se elenca le varianti attive.
