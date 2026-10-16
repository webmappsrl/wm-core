> Ticket: oc:8741

# Riconciliazione delle UGC sincronizzate — piano di implementazione

> **Per chi esegue:** sub-skill richiesta: superpowers:subagent-driven-development oppure
> superpowers:executing-plans. Gli step usano le checkbox (`- [ ]`).
> **Nessun `git add`, `git commit`, `git push` durante l'esecuzione:** i commit indicati sono
> istruzioni per il developer, da fare dopo il review-gate.

**Obiettivo:** dopo ogni scaricamento riuscito, togliere dal telefono le UGC sincronizzate (tracce e
POI) il cui id il server non restituisce più, con le immagini non più usate, e chiudere il pannello
se la UGC tolta era aperta.

**Architettura:** una funzione pura generica (`ugc-reconcile.ts`) calcola cosa togliere;
`UgcService._fetchUgcTracks()`/`_fetchUgcPois()` la applicano su localForage e, se serve, chiudono
il pannello con `UrlHandlerService.updateURL()`, lo stesso meccanismo di
`ugc-track-properties.component.ts:219`. Lo store si riallinea da solo: `syncUgcSuccess` ricarica
le liste da localForage.

**Stack:** Angular 20, NgRx 20, localForage, Jasmine/Karma.

**Spec:** [overview.md](overview.md)

Tutti i percorsi sono relativi a `wm-core/projects/wm-core/src/`, salvo dove indicato.

## Vincoli globali

- Branch: `feature/oc-8741-app-le-ugc-cancellate-sul-server-restano-visibili-sul-telefono-fino-al-logout`,
  creato da `Passaporto` in `wm-core` (PR verso `Passaporto`). In `webmapp-app` solo il puntatore
  al submodule.
- Si tocca solo la memoria `synchronized`, mai `device`.
- `null` dal server (errore HTTP o rete) o `features` non array → nessuna rimozione.
- Nessuna deduplica per uuid: due UGC del server con lo stesso uuid restano entrambe.
- Id confrontati come stringa da entrambe le parti.
- URL delle immagini letti da `properties.media[].webPath`, come `saveUgcImagesByStorage`.
- Prima si toglie la UGC, poi le sue immagini.
- Niente prefisso `I` sulle interfacce nuove; JSDoc su funzioni e metodi; commenti in italiano.

## Punti da tenere d'occhio in review

1. Fetch fallito (`null`) → nessuna rimozione: coperto in Task 2.
2. `features` assente o non array con risposta 200 → nessuna rimozione: coperto in Task 2.
3. Id numerico dal server e chiave stringa in locale → la UGC non viene tolta: coperto in Task 1.
4. Immagine condivisa fra una traccia tolta e un POI rimasto → non cancellata: coperto in Task 1.
5. UGC aperta tolta → pannello chiuso; UGC aperta diversa da quelle tolte → nessuna navigazione:
   coperto in Task 2.

---

### Task 1: funzione pura di riconciliazione

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-1-funzione-pura-di-riconciliazione)

**File:**
- Crea: `store/features/ugc/ugc-reconcile.ts`
- Test: `store/features/ugc/ugc-reconcile.spec.ts`

**Interfacce prodotte:**

```ts
export interface UgcReconcileResult<G extends Geometry> {
  toRemove: WmFeature<G>[];   // UGC locali sincronizzate da togliere
  imgUrlsToRemove: string[];  // URL immagini non più usati da nessuna UGC rimasta, senza doppioni
}

export function getUgcMediaUrls(feature: WmFeature<Geometry> | null | undefined): string[];

export function reconcileSynchronizedUgc<G extends Geometry>(
  serverFeatures: WmFeature<G>[],
  localSynchronized: WmFeature<G>[],
  otherSynchronized?: WmFeature<Geometry>[], // UGC sincronizzate dell'altro tipo (default [])
): UgcReconcileResult<G>;
```

Regole:
- `toRemove` = elementi di `localSynchronized` con `properties.id != null` e `` `${id}` `` non
  presente fra `` `${f.properties.id}` `` di `serverFeatures`.
- Insieme degli URL in uso = `getUgcMediaUrls` di: `serverFeatures`, `localSynchronized` meno
  `toRemove`, `otherSynchronized`.
- `imgUrlsToRemove` = URL di `toRemove` non presenti in quell'insieme.
- `getUgcMediaUrls` restituisce i `webPath` stringa di `properties.media`, `[]` se `media` non è un
  array.

- [ ] **Step 1: scrivi i test che falliscono**, in `ugc-reconcile.spec.ts` (Jasmine, funzioni pure,
  niente TestBed). Feature costruite con un helper `feat(id, uuid, webPaths: string[] = [])`.
  - `toglie le UGC il cui id il server non restituisce più`: server `[133]`, locale `[133, 134, 135]`
    → `toRemove` ha id `[134, 135]`.
  - `non toglie nulla se il server restituisce tutte le UGC locali`: server `[1, 2]`, locale `[1, 2]`
    → `toRemove` vuoto, `imgUrlsToRemove` vuoto.
  - `confronta gli id come stringa`: server con `id: 7` (numero), locale con `id: '7'` → `toRemove`
    vuoto.
  - `con elenco del server vuoto toglie tutte le sincronizzate`: server `[]`, locale `[1, 2]` →
    `toRemove` id `[1, 2]`.
  - `tiene due UGC del server con lo stesso uuid`: server `[133 uuid A, 134 uuid A]`, locale uguale
    → `toRemove` vuoto.
  - `cancella le immagini usate solo dalla UGC tolta`: locale `134` con `['a.jpg', 'b.jpg']`, server
    `133` con `['a.jpg']` → `imgUrlsToRemove` uguale a `['b.jpg']`.
  - `non cancella un'immagine usata da una UGC dell'altro tipo`: tolta con `['p.jpg']`,
    `otherSynchronized` con un POI con `['p.jpg']` → `imgUrlsToRemove` vuoto.
  - `ignora le UGC locali senza id`: locale con una feature senza `properties.id` → non è in
    `toRemove`.
  - `getUgcMediaUrls restituisce [] senza media`: `properties.media` assente o non array → `[]`.

- [ ] **Step 2: verifica che falliscano.**
  Da `wm-core/`: `npx ng test wm-core --watch=false --include='projects/wm-core/src/store/features/ugc/ugc-reconcile.spec.ts'`
  Atteso: errore di compilazione, `ugc-reconcile` non esiste.

- [ ] **Step 3: implementa** `reconcileSynchronizedUgc` e `getUgcMediaUrls` in `ugc-reconcile.ts`
  secondo le regole sopra, con `Set<string>` per id e URL. JSDoc su entrambe. In testa al file un
  commento: la riconciliazione presuppone che l'index del server restituisca **tutte** le UGC
  dell'utente (`UgcController::index()` in wm-package, non paginato); se diventa paginato o filtrato
  va rivista.

- [ ] **Step 4: verifica che passino.** Stesso comando dello step 2. Atteso: tutti PASS.

- [ ] **Step 5 (istruzione per il developer, non eseguire):**
  `fix(oc:8741): funzione pura di riconciliazione delle UGC sincronizzate`

---

### Task 2: riconciliazione nei fetch e chiusura del pannello

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-2-riconciliazione-nei-fetch-e-chiusura-del-pannello)

**File:**
- Modifica: `store/features/ugc/ugc.service.ts` — costruttore (righe 41-45), `_fetchUgcPois()`
  (80-101), `_fetchUgcTracks()` (103-124)
- Test: `store/features/ugc/ugc.service.spec.ts`

**Interfacce consumate:** `reconcileSynchronizedUgc`, `UgcReconcileResult` (Task 1);
`getSynchronizedUgcTracks`, `getSynchronizedUgcPois`, `removeSynchronizedUgcTrack`,
`removeSynchronizedUgcPoi`, `removeImg` da `@wm-core/utils/localForage`; selettori `currentUgcTrack`,
`currentUgcPoi` da `./ugc.selector`; `UrlHandlerService` da `@wm-core/services/url-handler.service`.

**Interfacce prodotte (private):**

```ts
private async _reconcileUgcTracks(apiTracks: WmFeature<LineString>[]): Promise<void>;
private async _reconcileUgcPois(apiPois: WmFeature<Point>[]): Promise<void>;
```

- [ ] **Step 1: aggiorna il TestBed** di `ugc.service.spec.ts`: aggiungi
  `{provide: UrlHandlerService, useValue: jasmine.createSpyObj('UrlHandlerService', ['updateURL'])}`.

- [ ] **Step 2: scrivi i test che falliscono**, in un `describe('riconciliazione (oc:8741)')`.
  Spy su `_getApiTracks`/`_getApiPois` e su `_reconcileUgcTracks`/`_reconcileUgcPois`; per i test
  della chiusura, `mockStore.select` restituisce `of(<feature corrente>)`.
  - `_fetchUgcTracks non riconcilia se il server restituisce null`: `_getApiTracks` → `null` →
    `_reconcileUgcTracks` non chiamato.
  - `_fetchUgcTracks non riconcilia se features non è un array`: `_getApiTracks` →
    `{type: 'FeatureCollection'}` → `_reconcileUgcTracks` non chiamato.
  - Gli stessi due per `_fetchUgcPois` / `_reconcileUgcPois`.
  - `_reconcileUgcTracks chiude il pannello se la traccia aperta è stata tolta`: locale
    sincronizzato `[133, 134]` (spy sulle funzioni di localForage), server `[133]`, traccia corrente
    `134` → `updateURL` chiamato con `{ugc_track: undefined}`; `removeSynchronizedUgcTrack`
    chiamato con `134`.
  - `_reconcileUgcTracks non chiude il pannello se la traccia aperta è rimasta`: traccia corrente
    `133` → `updateURL` non chiamato.
  - `_reconcileUgcPois chiude il pannello se il POI aperto è stato tolto`: analogo, con
    `{ugc_poi: undefined}`.

  Se gli spy sulle funzioni esportate da `localForage.ts` non sono intercettabili (import ES
  diretti), spia invece le istanze `synchronizedUgcTrack`/`synchronizedUgcPoi`/`synchronizedImg`
  (`keys`, `getItem`, `iterate`, `removeItem`) come fa `utils/localForage.spec.ts`.

- [ ] **Step 3: verifica che falliscano.**
  `npx ng test wm-core --watch=false --include='projects/wm-core/src/store/features/ugc/ugc.service.spec.ts'`
  Atteso: FAIL sui test nuovi, i test esistenti restano PASS.

- [ ] **Step 4: implementa.**
  - Inietta `UrlHandlerService` nel costruttore (`private _urlHandlerSvc: UrlHandlerService`).
  - In `_fetchUgcTracks()`: dopo il controllo `== null`, esci anche se
    `!Array.isArray(apiUgcTracks.features)`. Dopo il ciclo di salvataggio esistente:
    `await this._reconcileUgcTracks(apiUgcTracks.features)`. Uguale in `_fetchUgcPois()`.
  - `_reconcileUgcTracks(apiTracks)`: rilegge `getSynchronizedUgcTracks()` (dopo i salvataggi del
    ciclo) e `getSynchronizedUgcPois()`; chiama
    `reconcileSynchronizedUgc(apiTracks, tracks, pois)`; per ogni elemento di `toRemove`
    `await removeSynchronizedUgcTrack(id)`, poi `removeImg` per ogni URL di `imgUrlsToRemove`;
    infine, se `toRemove` non è vuoto, legge `currentUgcTrack` con `take(1)` e, se il suo
    `properties.id` (come stringa) è fra gli id tolti, `this._urlHandlerSvc.updateURL({ugc_track: undefined})`.
  - `_reconcileUgcPois(apiPois)`: speculare, con `currentUgcPoi` e `{ugc_poi: undefined}`.
  - Il confronto con la UGC aperta usa l'oggetto in store, non il parametro dell'URL: per una
    traccia appena registrata `ugc_track` può essere l'uuid (`modal-success.component.ts:203`).

- [ ] **Step 5: verifica che passino.** Stesso comando dello step 3. Atteso: tutti PASS.

- [ ] **Step 6: suite completa di wm-core.** `npm run test:single` da `wm-core/`. Atteso: nessuna
  regressione rispetto a prima.

- [ ] **Step 7 (istruzione per il developer, non eseguire):**
  `fix(oc:8741): riconciliazione delle UGC sincronizzate dopo lo scaricamento`

---

### Task 3: build dell'app e collaudo manuale

**File:** nessuno in `wm-core`. In `webmapp-app`: puntatore al submodule dopo il merge.

- [ ] **Step 1: build dell'app.** Da `webmapp-app/core/`: `npm run build`. Atteso: build senza
  errori (verifica che l'iniezione di `UrlHandlerService` in `UgcService` non crei dipendenze
  circolari).

- [ ] **Step 2: collaudo sul dev di camminiditalia, utente 3680** (con Giuseppe):
  1. Giuseppe ricarica sul dev un dump antecedente al command di oc:8718;
  2. login dall'app collegata al dev: si vedono i doppioni (133, 134, 135…);
  3. aprire il dettaglio della 134;
  4. Giuseppe rilancia `wm:fix-duplicated-ugc`;
  5. senza logout, entro circa 60 secondi: resta una sola copia per traccia e il pannello della
     134 si è chiuso;
  6. una UGC di prova cancellata da Nova sparisce dal telefono;
  7. in modalità aereo, al sync non sparisce nulla.
  Atteso: tutti i punti verificati; esito annotato in `notes.md`.

- [ ] **Step 3 (istruzione per il developer, non eseguire):** in `webmapp-app`,
  `chore(oc:8741): aggiorna il submodule wm-core`.
