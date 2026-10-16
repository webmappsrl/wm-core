> Ticket: oc:8743

# Dati tecnici e linea delle tracce UGC con la pulizia GPS del backend — piano di implementazione

> **Per chi esegue:** un task alla volta, nell'ordine. **Nessun `git add`/`commit`/`push`**: i
> blocchi «Commit» sono istruzioni per il developer, da eseguire solo dopo il suo via libera.

**Obiettivo:** pulizia GPS e dati tecnici delle tracce UGC calcolati in un solo punto di wm-core,
identici a `properties.stats` del server, usati da pannello, plancia, linea live, salvataggio e
riepilogo.

**Architettura:** un modulo di funzioni pure (`utils/ugc-track-stats.ts`) traduce la specifica di
wm-package; una classe incrementale (`UgcTrackCleaner`) applica la stessa regola punto per punto
durante la registrazione; un servizio (`UgcTrackStatsService`) aggiunge i parametri di
`config.json` e sceglie fra `stats` del server e calcolo locale. Tutti gli altri pezzi leggono da
lì.

**Stack:** Angular 20, NgRx 20, Karma/Jasmine (`npm test` in wm-core), OpenLayers 7 in map-core.

**Spec:** wm-package `docs/knowledge/dati-tecnici-delle-tracce-ugc.md` al commit
`295ad87a2304f5779bc09d8747c4ef6326d68740` (branch `develop`). Overview: `overview.md` in questa
cartella e nelle cartelle con lo stesso slug di map-core, wm-types e webmapp-app.

## Vincoli globali

- Formule, ordine dei passi, casi limite e arrotondamenti **esattamente** come nella specifica
  (§2, §3, §4, §6). Dove il piano e la specifica non coincidono vince la specifica.
- Arrotondamento solo con `phpRound` (§2 «Arrotondamento»), una volta sola alla fine. Mai
  `Math.round(x*10**d)/10**d`, mai `toFixed` nei calcoli.
- Haversine con R = 6.371.000 m; non `getDistance()` di OpenLayers.
- Default dei parametri: `max_accuracy` 40, `max_deviation` 50, `max_speed_percentile` 95,
  `moving_min_speed` 1 (§7).
- `map-core` non importa mai `wm-core`.
- i18n: chiave = testo italiano, ripetuto in `it.ts`; lingue de, en, es, fr, it, pr, sq.
- `wm-types` non usa il prefisso `I`; in wm-core le interfacce nuove senza prefisso `I` (preferenza
  del team).
- Commenti e documentazione in italiano. JSDoc sulle funzioni pubbliche.
- Nessuna modifica alle modifiche locali già presenti in wm-types (`.gitignore`,
  `src/environment.ts`).

## Focus della review

1. **Traccia senza `locations` e senza `stats`** (GPX caricato): il pannello mostra la distanza
   dalla geometria e «—» negli altri campi, nessun errore. Test nel Task 4.
2. **`stats` presente con `ascent: null`** (DEM non ancora pronto): dislivello «—», non la quota
   GPS e non `0`. Test nel Task 4.
3. **Annullare il salvataggio e riprendere** la registrazione: la geometria letta per il
   salvataggio non deve consumare i sospetti in attesa. Test nel Task 3 (`keptIfStoppedNow` non
   cambia lo stato).
4. **Primo punto della registrazione invalido** (`[0,0]` da `_getEmptyWmFeature`): scartato dalla
   pulizia, mai disegnato. Test nel Task 3.
5. **Ripresa dopo un crash:** linea e geometria ripartono dai soli punti tenuti dei `locations`
   salvati. Verifica manuale nel Task 6.

---

### Task 1: tipo `UgcTrackStats` (wm-types)

**File:**
- Modifica: `wm-types/src/feature.ts` (`LineStringProperties`, riga 24 circa)

**Interfacce prodotte:**
```ts
export interface UgcTrackStats {
  distance: number;              // km, 2 decimali
  duration: number | null;       // minuti interi
  duration_moving: number | null;// minuti interi
  avg_speed: number | null;      // km/h, 1 decimale
  max_speed: number | null;      // km/h, 1 decimale
  ascent: number | null;         // m, DEM, solo server
  descent: number | null;
  ele_min: number | null;
  ele_max: number | null;
  ele_from: number | null;
  ele_to: number | null;
  computed_at: string;           // ISO 8601 UTC
}
// in LineStringProperties:
stats?: UgcTrackStats;
```

- [ ] **Step 1:** aggiungi il tipo e il campo opzionale, con l'unità nei commenti.
- [ ] **Step 2:** `npx tsc --noEmit -p core/tsconfig.json` dal repo app → nessun errore nuovo.
- [ ] **Commit (wm-types):** `feat(oc:8743): tipo stats delle tracce UGC`

---

### Task 2: modulo puro di pulizia e calcolo + fixture (wm-core)

**File:**
- Crea: `projects/wm-core/src/utils/ugc-track-stats.ts`
- Crea: `projects/wm-core/src/utils/ugc-track-stats.spec.ts`
- Crea: `projects/wm-core/src/utils/fixtures/ugc-track-stats/` con i 9 JSON e il `README.md` di
  wm-package (`gh api repos/webmappsrl/wm-package/contents/tests/fixtures/ugc-track-stats/<file>?ref=295ad87a2304f5779bc09d8747c4ef6326d68740`),
  più in testa al README la riga
  `> Copiati da wm-package \`tests/fixtures/ugc-track-stats/\` al commit 295ad87a2304f5779bc09d8747c4ef6326d68740 (develop, 08/10/2026), oc:8743. Una regola che cambia si cambia in entrambi i repo.`
- Modifica: `projects/wm-core/tsconfig.spec.json` → `"resolveJsonModule": true` in
  `compilerOptions`.

**Interfacce prodotte:**
```ts
export interface UgcTrackStatsParams {
  max_accuracy: number; max_deviation: number;
  max_speed_percentile: number; moving_min_speed: number;
}
export const UGC_TRACK_STATS_DEFAULT_PARAMS: UgcTrackStatsParams; // 40, 50, 95, 1
export type UgcTrackLocalStats =
  Pick<UgcTrackStats, 'distance' | 'duration' | 'duration_moving' | 'avg_speed' | 'max_speed'>;

export function phpRound(x: number, decimals: number): number;            // §2, codice della spec
export function isKeptLocations(locations: Location[], params: UgcTrackStatsParams): boolean[]; // §2 (a)
export function computeUgcTrackLocalStats(kept: Location[], params: UgcTrackStatsParams): UgcTrackLocalStats | null; // §3; null se kept < 2
export function haversineMeters(a: Location, b: Location): number;         // §2 (c)
export function lineLengthKm(coordinates: number[][]): number;             // haversine su [lon,lat,…], phpRound 2
export function gpsAscentMeters(kept: Location[]): number | null;          // vedi sotto
```
`Location` è quello di `@wm-types/feature`.

- [ ] **Step 1: test che fallisce.** `ugc-track-stats.spec.ts` importa i 9 JSON e, per ciascuno
  (un `it` per file, nome = nome del file):
  ```ts
  const flags = isKeptLocations(f.locations, f.params);
  expect(flags).toEqual(f.expected_kept);
  const kept = f.locations.filter((_, i) => flags[i]);
  expect(computeUgcTrackLocalStats(kept, f.params)).toEqual(f.expected); // expected può essere null (05)
  ```
  Più: `phpRound(1.005, 2) === 1.01`, `phpRound(0.285, 2) === 0.29`, `phpRound(1.45, 1) === 1.5`,
  `phpRound(2.5, 0) === 3`; percentile dell'esempio §4 → `12.0` (testato via
  `computeUgcTrackLocalStats` o con una funzione esportata `percentileNearestRank(values, p)`).
- [ ] **Step 2:** `npm run test:single` in wm-core → FAIL (modulo inesistente).
- [ ] **Step 3: implementa** seguendo §2–§4 e §6 alla lettera. `distanzaPuntoSegmento` è il codice
  di §2 (a). `gpsAscentMeters`: somma delle differenze positive di `altitude` fra punti tenuti
  consecutivi che hanno entrambi `altitude` numerica, `phpRound(…, 0)`; `null` se nessuna coppia
  ha la quota. È il dislivello mostrato **solo** prima della sincronizzazione (decisione del dev),
  non fa parte delle fixture.
- [ ] **Step 4:** `npm run test:single` → i 9 casi e i test di `phpRound` passano.
- [ ] **Commit (wm-core):** `feat(oc:8743): pulizia GPS e dati tecnici delle tracce UGC come il backend`

---

### Task 3: pulizia incrementale `UgcTrackCleaner` (wm-core)

**File:**
- Modifica: `projects/wm-core/src/utils/ugc-track-stats.ts`
- Modifica: `projects/wm-core/src/utils/ugc-track-stats.spec.ts`

**Interfacce prodotte:**
```ts
export class UgcTrackCleaner {
  constructor(params: UgcTrackStatsParams);
  /** Aggiunge un punto; restituisce i punti tenuti decisi da questo push (0, 1 o più). */
  push(location: Location): Location[];
  /** Punti tenuti decisi finora (esclusi i sospetti in attesa). */
  readonly kept: Location[];
  /** Punti tenuti se la registrazione finisse ora: `kept` + i sospetti in attesa decisi senza
   *  ancora destra (§2 a). Non modifica lo stato. */
  keptIfStoppedNow(): Location[];
}
```

Regola: un punto invalido si scarta subito; un buono si tiene subito e prima decide, in ordine,
tutti i sospetti in attesa con ancora destra = quel punto (un sospetto tenuto diventa ancora
sinistra per i successivi); un sospetto va in attesa. Con ancora sinistra assente e destra
presente vale `from = to = destra`, come nella spec.

- [ ] **Step 1: test che fallisce.** Per ognuna delle 9 fixture:
  `push` di tutti i `locations` in ordine, poi
  `expect(cleaner.keptIfStoppedNow()).toEqual(f.locations.filter((_, i) => f.expected_kept[i]))`;
  e `kept` è sempre un prefisso di `keptIfStoppedNow()`.
  Più: dopo `keptIfStoppedNow()`, un ulteriore `push` di un punto buono dà lo stesso risultato
  che senza la chiamata (stato non modificato; focus 3); un primo punto `{latitude: 0, longitude: 0}`
  non compare mai in `kept` (focus 4); un buono che arriva dopo due sospetti restituisce da `push`
  i sospetti tenuti più il buono, in ordine.
- [ ] **Step 2:** `npm run test:single` → FAIL.
- [ ] **Step 3:** implementa `UgcTrackCleaner` riusando le funzioni interne del Task 2 (stessa
  classificazione e stessa `distanzaPuntoSegmento`, nessuna copia).
- [ ] **Step 4:** `npm run test:single` → PASS.
- [ ] **Commit (wm-core):** `feat(oc:8743): pulizia GPS incrementale per la registrazione`

---

### Task 4: parametri da `config.json` e `UgcTrackStatsService` (wm-core)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-4-parametri-e-servizio)

**File:**
- Modifica: `projects/wm-core/src/types/config.ts:191-196` → `record: {enable: boolean; stats?: Partial<UgcTrackStatsParams>}`
- Crea: `projects/wm-core/src/services/ugc-track-stats.service.ts` (+ `.spec.ts`)

**Interfacce prodotte:**
```ts
export interface UgcTrackDetails {
  distance: number | null; duration: number | null; duration_moving: number | null;
  avg_speed: number | null; max_speed: number | null; ascent: number | null;
  source: 'server' | 'local';
}
export function resolveUgcTrackStatsParams(conf?: Partial<UgcTrackStatsParams> | null): UgcTrackStatsParams;
export function ugcTrackDetails(track: WmFeature<LineString>, params: UgcTrackStatsParams): UgcTrackDetails;

@Injectable({providedIn: 'root'})
export class UgcTrackStatsService {
  readonly params$: Observable<UgcTrackStatsParams>; // store.select(confGEOLOCATION) → record?.stats → resolve
  details$(track: WmFeature<LineString>): Observable<UgcTrackDetails>;
}
```

`ugcTrackDetails`:
- `properties.stats` presente → i suoi valori, `ascent = stats.ascent` (anche `null`), `source: 'server'`;
- altrimenti, `locations` con almeno 2 tenuti → `computeUgcTrackLocalStats` + `gpsAscentMeters`, `source: 'local'`;
- altrimenti → `distance = lineLengthKm(geometry.coordinates)` (o `null` se < 2 coordinate), il resto `null`, `source: 'local'`.

`resolveUgcTrackStatsParams`: per ogni chiave il valore di config se numero finito, altrimenti il
default (il server normalizza già; qui solo difesa da chiave mancante).

- [ ] **Step 1: test che fallisce** (funzioni pure, senza TestBed):
  - traccia con `stats` della traccia 174 (§1) → `distance 9.37`, `ascent 313`, `max_speed 6.5`, `source 'server'`;
  - `stats` con `ascent: null` → `ascent === null` (focus 2);
  - senza `stats`, `locations` della fixture 04 → valori `expected` della fixture, `source 'local'`;
  - senza `stats` e senza `locations`, geometria di 2 punti a 10 m → `distance 0.01`, gli altri `null` (focus 1);
  - `resolveUgcTrackStatsParams(undefined)` → default; `({max_accuracy: 30})` → `30, 50, 95, 1`.
- [ ] **Step 2:** FAIL. **Step 3:** implementa. **Step 4:** PASS.
- [ ] **Commit (wm-core):** `feat(oc:8743): dati tecnici dal server o calcolati al volo`

---

### Task 5: pannello «Dettagli tecnici» e traduzioni (wm-core)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-5-pannello-e-traduzioni)

**File:**
- Modifica: `projects/wm-core/src/ugc-details/ugc-track-data/ugc-track-data.component.ts|html`
- Modifica: `projects/wm-core/src/localization/i18n/{de,en,es,fr,it,pr,sq}.ts`

Il componente riceve `track`, espone `details$: Observable<UgcTrackDetails>` da
`UgcTrackStatsService.details$` (input in un `BehaviorSubject` + `switchMap`) e non usa più
`GeoutilsService`.

Righe, **sempre presenti** (niente `*ngIf` per riga: un valore che arriva non sposta il layout),
valore `—` se `null`:

| Etichetta (chiave i18n) | Valore |
|---|---|
| `duration` (esistente, «Durata») | `duration * 60 \| wmTimeFormatter` |
| `Tempo in movimento` (nuova) | `duration_moving * 60 \| wmTimeFormatter` |
| `distance` | `distance \| distance:'km':2` |
| `ascent` | `ascent \| distance:'m':0` |
| `Velocità media` | `avg_speed \| number:'1.1-1'` km/h |
| `Velocità massima` | `max_speed \| number:'1.1-1'` km/h |

- [ ] **Step 1:** nuova chiave `'Tempo in movimento'` in tutte e 7 le lingue (it: `Tempo in
  movimento`, en: `Moving time`, de: `Bewegungszeit`, es: `Tiempo en movimiento`, fr: `Temps en
  mouvement`, pr: `Tempo em movimento`, sq: `Koha në lëvizje`); in `en.ts` `'Velocità massima':
  'Maximum speed'`. Prima di aggiungere, `grep` della chiave: due chiavi uguali non compilano.
- [ ] **Step 2:** componente e template come sopra; la riga «Tempo» (chiave `Tempo`) sparisce dal
  pannello (la chiave i18n resta, altri la usano).
- [ ] **Step 3:** `npm run test:single` in wm-core → PASS; `ng build` dell'app → nessun errore di
  template.
- [ ] **Step 4 (manuale):** su `camminiditalia.dev.maphub.it` (utente 3339) aprire la traccia 174
  → 2h 45m 0s, 2h 24m 0s, 9.37 km, 313 m, 3.4 km/h, 6.5 km/h.
- [ ] **Commit (wm-core):** `feat(oc:8743): pannello dei dettagli tecnici da stats o calcolo locale`

---

### Task 6: linea live e registrazione con i soli punti tenuti (map-core + wm-core)

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-6-registrazione-e-linea-live)

**File:**
- Modifica: `map-core/src/directives/track.record.directive.ts`
- Modifica: `wm-core/projects/wm-core/src/services/geolocation.service.ts`
- Modifica: `wm-core/projects/wm-core/src/geobox-map/geobox-map.component.ts|html`

**Interfacce:**
- map-core: gli input `WmMapTrackRecordLocation` (e il binding orfano
  `WmMapTrackRecordInitLocations`) sono sostituiti da
  `@Input() WmMapTrackRecordLocations: Location[] | null` — l'elenco completo dei punti tenuti.
  A ogni cambio: `geometry.setCoordinates(locations.map(l => fromLonLat([l.longitude, l.latitude])))`.
  Buffer e timeout di `_addLocation` si tolgono (un `setCoordinates` per emissione). `null` o
  `[]` → linea vuota.
- wm-core `GeolocationService`:
  - `readonly recordedKeptLocations$: BehaviorSubject<Location[]>` — `cleaner.kept` dopo ogni push;
  - campo privato `_cleaner: UgcTrackCleaner | null`, creato in `startRecording()` con i parametri
    di `UgcTrackStatsService.params$` (letti una volta, `take(1)`, all'avvio), azzerato in
    `stopRecording()`;
  - `_addLocationToRecording`: `locations` riceve sempre il punto grezzo (come oggi, e
    `saveCurrentUgcTrackLocations` invariato); `geometry.coordinates` non si tocca più punto per
    punto; `cleaner.push(location)` e, se ha deciso qualcosa, `recordedKeptLocations$.next(cleaner.kept)`;
  - getter `recordedFeature`: restituisce una copia con
    `geometry.coordinates = cleaner.keptIfStoppedNow().map(l => [l.longitude, l.latitude, l.altitude ?? 0])`
    e `properties.locations` grezzi — è ciò che `modal-save` salva (focus 3: non cambia lo stato);
  - `_getEmptyWmFeature()`: il punto iniziale va anche nel cleaner (se invalido viene scartato, focus 4);
  - `resumeRecordingFromSaved()`: nuovo cleaner, `push` di tutti i `savedLocations`, poi
    `recordedKeptLocations$.next(cleaner.kept)`; `onResumeRecording$` si elimina.
- `geobox-map`: `[WmMapTrackRecordLocations]="recordKeptLocations$|async"` al posto delle due
  righe 20-21; `recordInitLocations$` si elimina. Ordine degli attributi secondo
  `.claude/rules/template-wm-map.md`.

- [ ] **Step 1:** direttiva map-core; `npm run build` in map-core → OK.
- [ ] **Step 2:** `GeolocationService` e `geobox-map`; `npm run test:single` in wm-core → PASS;
  `ng build` dell'app → OK; `grep -rn "onResumeRecording\|WmMapTrackRecordLocation\b\|InitLocations"`
  → nessun risultato.
- [ ] **Step 3 (manuale, browser con sensori simulati o dispositivo):** registrare, verificare che
  la linea cresce; simulare un punto con accuracy 3000 lontano → mai disegnato; chiudere l'app a
  metà e riaprirla → la linea riparte con i punti già tenuti (focus 5).
- [ ] **Commit (map-core):** `feat(oc:8743): la linea di registrazione disegna l'elenco dei punti ricevuti`
- [ ] **Commit (wm-core):** `feat(oc:8743): registrazione con la pulizia GPS del backend`

---

### Task 7: plancia, riepilogo e copia di geoutils dell'app (webmapp-app) + pulizia di wm-core

> ⚠️ L'implementazione ha deviato da questo task: [notes.md](notes.md#task-7-plancia-riepilogo-e-pulizia)

**File:**
- Modifica: `core/src/app/components/track-recorder-component/track-recorder.component.ts:121-131`
- Modifica: `core/src/app/components/modal-success/modal-success.component.ts:84-92|html`
- Modifica: `core/src/app/components/shared/recording-btn/recording-btn.component.ts:2`
- Modifica: `core/src/app/components/cards/card-big/card-big.component.ts:5,51`
- Elimina: `core/src/app/services/geoutils.service.ts`
- Modifica: `wm-core/projects/wm-core/src/services/geoutils.service.ts` (rimozione metodi)
- `modal-save.component.ts`: **nessuna modifica** — salva già `recordedFeature.geometry`, che dal
  Task 6 contiene solo i punti tenuti. Verificare soltanto.

- [ ] **Step 1: plancia.** `length` = `lineLengthKm` dei `recordedKeptLocations$` correnti (in km,
  come oggi); `averageSpeed` = `computeUgcTrackLocalStats(kept, params)?.avg_speed ?? null`. La
  velocità attuale resta `location.speed ?? getCurrentSpeed(...)` (grezza, rischio noto
  nell'overview).
- [ ] **Step 2: riepilogo.** `modal-success` usa `UgcTrackStatsService.details$(this.track)`
  (`take(1)`): `trackodo = distance`, `trackSlope = ascent`, `trackAvgSpeed = avg_speed`,
  `trackTopSpeed = max_speed`, `trackTime = GeoutilsService.formatTime(duration * 60)` col
  `GeoutilsService` di wm-core; `trackDate = new Date()` (è ciò che fa oggi `getDate` della copia
  dell'app, che restituisce sempre la data corrente).
  Nel template un `null` → `—`.
- [ ] **Step 3:** `recording-btn` importa `GeoutilsService` da `@wm-core/services/geoutils.service`;
  da `card-big` si toglie import e iniezione; si elimina `core/src/app/services/geoutils.service.ts`.
- [ ] **Step 4: wm-core.** Da `GeoutilsService` si tolgono `getTime`, `getLength`, `getSlope`,
  `getAverageSpeed`, `getTopSpeed`, `getSpeeds` e gli helper privati rimasti senza chiamanti
  (`grep` prima di ogni rimozione; `getCurrentSpeed`, `formatTime` e la distanza rimanente restano).
  La copia locale morta di `ugc-track-data` in wm-webapp usa quei metodi ma non è compilata
  (`tsconfig.app.json` parte da `main.ts`): verificare con `ng build` della webapp.
- [ ] **Step 5:** `grep -rn "services/geoutils.service'" core/src/app --include='*.ts' | grep -v shared/`
  → nessun risultato; `npm run lint` e `ng build` dell'app → OK; `npm run test:single` in wm-core → PASS.
- [ ] **Step 6 (manuale):** registrare offline una traccia breve → plancia, riepilogo e pannello
  mostrano la stessa distanza; dopo la sincronizzazione il pannello passa ai valori del server e
  il dislivello arriva entro circa un minuto.
- [ ] **Commit (webmapp-app):** `feat(oc:8743): plancia e riepilogo con i dati tecnici di wm-core`
- [ ] **Commit (wm-core):** `refactor(oc:8743): tolti i calcoli delle tracce non più usati`
