> Ticket: oc:8177

# Piano implementativo — Distanza rimanente e posizione nel profilo altimetrico

Tutti i task sono nel submodule `wm-core` (nessun file nel repo principale). Commit convention: `feat(oc:8177): ...` / `refactor(oc:8177): ...`. Nessun commit va eseguito automaticamente durante l'implementazione — solo a fine review, dopo approvazione esplicita del developer.

## 1. Estrarre il calcolo della lunghezza totale da `SlopeChartComponent` a `GeoutilsService`

**Perché prima di tutto:** la challenge ha identificato il rischio di scarti numerici tra il totale mostrato nel grafico e la `remainingDistance` del nuovo componente. L'unico modo per garantire coerenza per costruzione (non per coincidenza) è avere un'unica funzione che entrambi chiamano.

- In `services/geoutils.service.ts`, aggiungere metodo pubblico:
  ```ts
  getHaversineTrackLength(trackGeometry: LineString): number
  ```
  Porta la logica di accumulo oggi inline in `SlopeChartComponent._setChart()` (uso di `getDistanceBetweenPoints` su punti consecutivi della geometria, righe ~516-556 di `slope-chart.component.ts`). Stessa matematica, stesso output in metri — nessun cambio di comportamento.
- In `slope-chart.component.ts`, sostituire l'accumulo locale di `trackLength` con una chiamata al nuovo metodo di `GeoutilsService` (già iniettato o da iniettare nel componente).
- Verifica manuale: aprire una traccia esistente, confermare che il grafico altimetrico e le distanze in km sull'asse X sono identiche a prima del refactor (nessuna regressione visiva).

**Commit:** `refactor(oc:8177): estrai calcolo lunghezza traccia da SlopeChartComponent a GeoutilsService`

## 2. `GeoutilsService.getRemainingDistance()` — proiezione GPS sulla traccia

- Aggiungere metodo pubblico:
  ```ts
  getRemainingDistance(
    userPosition: Location,
    trackGeometry: LineString,
    trackLength: number,
    lastKnownProgress: number | null,
  ): {remainingDistance: number; trackProgress: number; distanceFromTrack: number} | null
  ```
- Implementazione:
  1. Guard: se `trackGeometry?.coordinates?.length < 2`, ritorna `null`.
  2. Trasforma `trackGeometry.coordinates` e `userPosition` in EPSG:3857 con `fromLonLat` (stesso pattern di `pickNearestLayerFromFeatures`), costruisci una `ol/geom/LineString` in 3857.
  3. Se `lastKnownProgress != null`: individua l'indice di segmento corrispondente a `lastKnownProgress * trackLength` (percorrendo le distanze cumulative) e costruisci una sotto-linea (finestra) di N segmenti prima/dopo quell'indice (es. ±20% della lunghezza totale, minimo 5 segmenti) su cui eseguire `getClosestPoint()`. Altrimenti usa la geometria completa.
  4. Se la distanza tra `userPosition` proiettato e il punto trovato nella finestra implica un progress-jump incompatibile con la velocità massima plausibile di un camminatore rispetto al tempo trascorso dall'ultimo fix (usa `lastKnownProgress` + un secondo parametro `elapsedSeconds` da passare dall'effect, vedi punto 4) — ripeti la ricerca su tutta la linea (fallback globale).
  5. Calcola la distanza cumulativa dal punto proiettato all'inizio della linea, sommando le lunghezze dei segmenti attraversati (stessa unità/metrica di `getHaversineTrackLength`, non mescolare euclidea 3857 con haversine per il totale — usa la stessa fonte del punto 1 per il denominatore, la distanza *cumulativa fino al punto* può restare in 3857 euclidea dato che è un delta locale, l'errore relativo resta trascurabile).
  6. `trackProgress = percorso / trackLength`; `remainingDistance = trackLength - percorso`.
  7. `distanceFromTrack` = distanza euclidea in metri tra `userPosition` (3857) e il punto proiettato.
  8. Se `distanceFromTrack > 100`, ritorna `null`.
- Nessun nuovo test automatico (out of scope per questo ciclo) — verifica manuale su almeno: una traccia lineare semplice, una traccia ad anello, un punto GPS a >100m dalla traccia (deve tornare `null`).

**Commit:** `feat(oc:8177): aggiungi GeoutilsService.getRemainingDistance con ricerca locale vincolata`

## 3. Store `user-activity` — stato, action, reducer, selector

- `user-activity.reducer.ts`: aggiungere a `UserActivityState`:
  ```ts
  trackRemainingDistance: number | null;
  trackProgress: number | null;
  trackPositionStale: boolean;
  ```
  Default: tutti `null`/`false`.
- `user-activity.action.ts`: due nuove action:
  - `setTrackRemainingDistance` — `props<{remainingDistance: number | null; trackProgress: number | null; stale: boolean}>()`
  - `resetTrackRemainingDistance` — nessun payload, resetta i tre campi a `null`/`false`
- `user-activity.reducer.ts`: due nuovi `on(...)` per le action sopra.
- `user-activity.selector.ts`: tre nuovi selector — `trackRemainingDistance`, `trackProgress`, `trackPositionStale`.

**Commit:** `feat(oc:8177): aggiungi stato remainingDistance/trackProgress a user-activity store`

## 4. Effect — combinare GPS e geometria traccia

In `user-activity.effects.ts`, nuovo effect (non-dispatching side-effect va bene con `{dispatch: true}` di default dato che dispatcha le action del punto 3):

- Sorgente: `combineLatest([geolocationSvc.onLocationChange$, store.select(currentEcTrack)])` (import da `ec.selector.ts`).
- Su ogni emissione, con `withLatestFrom` sui selector `trackProgress` (per `lastKnownProgress`) e uno stato locale per tracciare l'ultimo `currentEcTrack.id` visto:
  1. Se `currentEcTrack == null` → dispatch `resetTrackRemainingDistance()`, skip.
  2. Se `currentEcTrack.id` è cambiato rispetto all'ultimo visto → dispatch `resetTrackRemainingDistance()` **prima** di procedere al calcolo (garantisce nessun frame con dati della traccia precedente); aggiorna lo stato locale dell'id.
  3. Calcola `trackLength = geoutilsSvc.getHaversineTrackLength(currentEcTrack.geometry)` — memoizzare per `currentEcTrack.id` (una `Map` o semplice cache dell'ultimo id/valore) per non ricalcolare la lunghezza totale ad ogni fix GPS, solo al cambio traccia.
  4. Calcola `elapsedSeconds` dal timestamp dell'ultimo fix noto (per il fallback di cui al punto 2.4).
  5. Chiama `geoutilsSvc.getRemainingDistance(location, currentEcTrack.geometry, trackLength, lastKnownProgress)`.
  6. Calcola `stale = (Date.now() - location.time) > 60_000`.
  7. Dispatch `setTrackRemainingDistance({remainingDistance: result?.remainingDistance ?? null, trackProgress: result?.trackProgress ?? null, stale})`.
- Nota: `combineLatest` con un `ReplaySubject` esterno allo store richiede gestione esplicita di unsubscribe — gli effect NgRx si auto-gestiscono per il lifecycle del servizio, ma verificare che non ci siano subscription duplicate se l'effect viene ricreato (pattern coerente con gli altri effect esistenti in `ec.effects.ts`).

**Commit:** `feat(oc:8177): effect per calcolo remainingDistance da GPS live e traccia corrente`

## 5. Nuovo componente `wm-track-remaining-distance`

- Nuova cartella `projects/wm-core/src/track-remaining-distance/` con `track-remaining-distance.component.ts` + `.html` + `.scss`, seguendo la stessa struttura di componenti esistenti (es. `tab-detail`).
- Il componente seleziona `trackRemainingDistance` e `trackPositionStale` dallo store.
- Template: `*ngIf` su `trackRemainingDistance != null` (altrimenti non renderizzato, non un placeholder `--` visibile — coerente con "traccia non caricata" in Rischi); valore mostrato con `DistancePipe` (`'auto'` mode, input in metri); classe CSS attenuata (es. opacity ridotta) se `trackPositionStale`.
- Icona + testo, stile coerente con il pattern icona+valore già visto in `tab-detail.component.html:36-41`.
- Nuove chiavi i18n (es. `'remaining_distance'` o simile) in tutti i file `localization/i18n/{it,en,de,es,fr,pr,sq}.ts`, lingua base inglese, nessuna chiave mancante in nessun file.
- Registrare il componente in `wm-core.module.ts` (dove sono dichiarati gli altri componenti standalone del modulo).

**Commit:** `feat(oc:8177): nuovo componente wm-track-remaining-distance`

## 6. Integrazione in `TrackPropertiesComponent`

- `track-properties.component.html`: aggiungere `<wm-track-remaining-distance></wm-track-remaining-distance>` subito dopo il blocco `<wm-slope-chart>` (dopo riga 40 attuale).
- Passare a `wm-slope-chart` il nuovo input: `[trackProgress]="trackProgress$|async"`, dove `trackProgress$` è un nuovo observable nel componente che seleziona `trackProgress` dallo store (stesso pattern degli altri `$|async` già presenti nel file).

**Commit:** `feat(oc:8177): integra wm-track-remaining-distance e trackProgress in track-properties`

## 7. `WmSlopeChartComponent` — marker di posizione sul canvas

- Nuovo `@Input() trackProgress: number | null`.
- Nuovo plugin Chart.js dedicato (oggetto separato da `webmappTooltipPlugin`, es. `id: 'webmappPositionMarkerPlugin'`), hook `afterDraw`:
  - Se `trackProgress == null` o il tooltip di hover è attualmente attivo (stesso stato/flag che `webmappTooltipPlugin` già usa per sapere se è in hover) → non disegnare nulla, return.
  - Altrimenti: `ctx.save()`, disegna il marker (es. cerchio) alla coordinata X corrispondente a `trackProgress * chartWidth` sull'asse, `ctx.restore()`.
- Aggiornamento: il cambio di `trackProgress` in `ngOnChanges` deve chiamare un redraw leggero (`this._chart.update()` o `draw()`), **non** `_createChart()`. Verificare che `ngOnChanges` distingua esplicitamente "cambio `currentTrack`" (→ recreate, comportamento attuale) da "cambio `trackProgress`" (→ update leggero).
- Coordinamento con hover esistente: quando `webmappTooltipPlugin` è in stato "attivo" (hover/touch in corso), il marker va nascosto — serve un flag condiviso leggibile da entrambi i plugin (es. proprietà privata del componente, non dello stato NgRx).

**Verifica manuale esplicita richiesta prima del merge:** apertura traccia con GPS attivo entro 100m, interazione touch ripetuta sul grafico (drag, tap, release ripetuti), conferma assenza di artefatti visivi residui (colori/stroke sporchi) e corretta alternanza marker/tooltip.

**Commit:** `feat(oc:8177): marker posizione GPS su SlopeChartComponent`

## 8. Verifica end-to-end manuale (nessun test automatico in questo ciclo)

Checklist da eseguire su device reale o simulazione GPS prima di considerare la feature completa:
- [ ] Traccia lineare semplice: marker e distanza rimanente coerenti con la posizione simulata, valore decresce camminando verso la fine
- [ ] Traccia ad anello: nessuna oscillazione visibile del marker/distanza muovendosi con continuità lungo il percorso
- [ ] Posizione GPS a >100m dalla traccia: componente e marker non visibili
- [ ] Cambio traccia (tappa successiva) mentre GPS attivo: nessun frame con dato della traccia precedente
- [ ] GPS fix vecchio (>60s, es. simulando perdita di segnale): indicatore di staleness visibile
- [ ] Interazione touch ripetuta sul grafico: nessun artefatto visivo residuo, marker coerente con hover (nascosto durante, visibile dopo)
- [ ] `ugc-track-properties` e `draw-ugc`: nessuna regressione, nessun nuovo elemento UI comparso (fuori scope, `SlopeChartComponent` condiviso deve restare `null`-safe sui nuovi input)

## Note esecuzione

- Branch dedicato da creare in `wm-core` prima di iniziare (Fase execution del workflow wm-plan): `feature/oc-8177-distanza-rimanente-posizione-profilo-altimetrico`.
- Nessun file nel repo principale `webmapp-app` da modificare — solo submodule `wm-core`.
- Ordine dei task 1→7 è sequenziale per dipendenza logica (il refactor del punto 1 è prerequisito del punto 2 e 4); i task 5-6 possono procedere in parallelo al 7 una volta completati 1-4.
