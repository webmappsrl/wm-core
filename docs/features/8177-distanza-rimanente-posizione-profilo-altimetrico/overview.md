> Ticket: oc:8177

# Distanza rimanente e posizione nel profilo altimetrico

## Cosa cambia

Durante la visualizzazione di una traccia ufficiale (`EcTrack`) tramite `TrackPropertiesComponent`, l'app mostra in tempo reale:
- la **posizione corrente dell'utente** come marker sul profilo altimetrico (`WmSlopeChartComponent`), posizionato in base all'avanzamento percentuale lungo la traccia (`trackProgress`, 0-1);
- la **distanza rimanente** alla fine della traccia, in un nuovo componente dedicato posizionato subito sotto il grafico altimetrico (non un overlay sul canvas, non una riga in `tab-detail`).

Il calcolo è client-side: dato il punto GPS corrente (`GeolocationService.onLocationChange$`, già attivo in modalità `navigation` quando la mappa è aperta — nessun trigger aggiuntivo necessario) e la geometria della traccia corrente (`ec.currentEcTrack`, `WmFeature<LineString>` in EPSG:4326), si proietta il punto sulla linea usando le API native di OpenLayers (`fromLonLat` + `LineString.getClosestPoint()`, stesso pattern già usato in `GeoutilsService.pickNearestLayerFromFeatures` per oc:7639) e si calcola la distanza cumulativa rimanente sommando le lunghezze dei segmenti dal punto proiettato alla fine della linea.

La feature si attiva solo se l'utente si trova entro un **raggio di 100m** dalla traccia (valore di default, tarabile in seguito) — sia il nuovo componente sia il marker di posizione sul grafico restano non renderizzati/nascosti al di fuori di questo raggio, per evitare di mostrare un dato fuorviante quando l'utente sta solo consultando la traccia da lontano (es. in pianificazione).

Per evitare oscillazioni sui percorsi ad anello o con tratti sovrapposti (comuni nei Cammini d'Italia, dove il punto geometricamente più vicino può appartenere a una porzione del percorso molto lontana in progressione), la ricerca del closest point è **vincolata localmente** attorno all'ultimo `trackProgress` noto, con fallback a ricerca globale solo se lo scostamento implicito supera una soglia di velocità di camminata plausibile.

La distanza rimanente è calcolata come `distanza totale della traccia (dalla stessa fonte usata da SlopeChartComponent per l'asse del grafico) - distanza percorsa`, non con un calcolo indipendente, per evitare scarti numerici visibili tra il totale mostrato nel grafico e il residuo mostrato nel nuovo componente.

Se il fix GPS è più vecchio di una soglia (es. 60s, da `location.time`), il dato viene mostrato con un'indicazione visiva di "non aggiornato" invece di apparire falsamente live.

Al cambio di traccia (`currentEcTrack.id` diverso), lo stato calcolato viene resettato atomicamente a `null` prima di ricalcolare sulla nuova geometria, per evitare che venga mostrato anche per un solo frame un valore riferito alla traccia precedente.

Il marker di posizione sul grafico si **nasconde temporaneamente** quando l'utente sta interagendo con il grafico stesso (touch/hover, gestito dal plugin `webmappTooltipPlugin` esistente), per evitare sovrapposizione visiva con il tooltip di hover. Il marker è disegnato da un plugin Chart.js separato (hook `afterDraw`, con `ctx.save()`/`ctx.restore()` accoppiati) e aggiornato con un redraw leggero (`chart.update()`/`draw()`), **mai** con la recreate completa del chart (`_createChart()`) — quest'ultima resta riservata al cambio traccia.

Correlato a oc:7943 (richiesta originale dell'utente).

## Perché

È la domanda più frequente dei camminatori durante il percorso ("quanti km mancano?"). La richiesta è arrivata direttamente da una recensione utente (oc:7943).

## Requisiti

- [ ] `GeoutilsService` (`services/geoutils.service.ts`): nuovo metodo `getRemainingDistance(userPosition: Location, trackGeometry: LineString, lastKnownProgress: number | null): {remainingDistance: number; trackProgress: number; distanceFromTrack: number} | null` — usa `fromLonLat` + `getClosestPoint()` di OL (no turf.js, no nuova dipendenza); ricerca del closest point vincolata localmente attorno a `lastKnownProgress` (fallback a ricerca globale solo su scostamento implausibile); ritorna `null` se la geometria non è disponibile o `distanceFromTrack > 100m`
- [ ] `remainingDistance` calcolata come `totale (letto da `SlopeChartComponent`/stessa fonte dei `labels` del grafico) - percorso`, non con un calcolo di lunghezza totale indipendente — richiede esporre il totale/array cumulativo da `SlopeChartComponent` verso il nuovo calcolo
- [ ] Store `user-activity`: nuovo stato + selettore che espone `remainingDistance` (metri), `trackProgress` (0-1) e `locationStale` (boolean, da `location.time`), calcolati da un effect che combina `GeolocationService.onLocationChange$` con il selettore `currentEcTrack` (slice `ec`) — pattern analogo a `GeoboxMapComponent.featuresInLocationRange`/`setNearbyLayerId` (oc:7639); lo stato viene resettato atomicamente a `null` quando `currentEcTrack.id` cambia, prima di ricalcolare sulla nuova geometria
- [ ] Nuovo componente (es. `wm-track-remaining-distance`) in wm-core, posizionato in `track-properties.component.html` subito sotto `wm-slope-chart` — mostra `remainingDistance` formattata con `DistancePipe` esistente (conversione metri→km gestita dal pipe stesso, modalità `'auto'`); non renderizzato se fuori raggio (100m) o se geometria non disponibile; indicazione visiva attenuata se `locationStale`
- [ ] `WmSlopeChartComponent`: nuovo `@Input() trackProgress: number | null` (0-1, nessun nuovo tipo necessario) — disegna un marker sul canvas alla posizione corrispondente tramite un plugin Chart.js dedicato (hook `afterDraw`, `ctx.save()`/`ctx.restore()` accoppiati), aggiornato con redraw leggero (mai `_createChart()` per il solo cambio posizione); nascosto durante l'interazione hover/touch attiva e quando fuori raggio/geometria non disponibile
- [ ] Feature attiva solo su `track-properties.component` (traccia ufficiale EcTrack) — esplicitamente esclusa da `ugc-track-properties` e da `draw-ugc` (registrazione live, nessun punto di fine noto)
- [ ] Feature visibile solo se l'utente ha la geolocalizzazione attiva (permessi concessi) **e** si trova entro 100m dalla traccia (soglia di default, tarabile in seguito); nessuna richiesta di permesso aggiuntiva rispetto a quella già gestita da `GeolocationService`
- [ ] Testi UI traducibili in tutte le lingue presenti in `localization/i18n/` (it, en, de, es, fr, pr, sq), lingua base inglese
- [ ] Task di verifica manuale esplicito prima del merge: apertura traccia, interazione touch ripetuta sul grafico, verifica assenza di artefatti visivi residui tra marker GPS e tooltip di hover
- [ ] Componente `wm-track-remaining-distance` dietro il flag `OPTIONS.showTrackRemainingDistance` (wm-types) — se `false` il componente non è visibile; il marker/pendenza sul grafico altimetrico **non** è dietro questo flag, resta sempre attivo. Default client-side temporaneo `true` (`conf.reducer.ts`) per i test — da portare a `false` prima del rollout definitivo
- [ ] All'apertura di una traccia, se è già disponibile una posizione GPS valida (anche se l'utente è fermo), la distanza rimanente va calcolata e mostrata immediatamente, senza attendere un nuovo fix GPS

## Rischi

- **Traccia non caricata** — se `currentEcTrack`/la geometria non è disponibile, il nuovo componente non mostra un valore errato: resta non renderizzato o mostra `--`
- **Precisione GPS** — su terreni difficili l'accuracy può essere bassa; accettato, il dato è indicativo (nessuna soglia di validazione GPS aggiuntiva oltre allo staleness check su `location.time`)
- **Precisione geometrica OL vs turf.js** — usando `getClosestPoint()` di OL in EPSG:3857 invece di turf.js (calcolo geodetico), la distorsione di Web Mercator introduce un errore trascurabile (<1%) per tracce di scala escursionistica (decine di km, latitudini italiane 42-46°N); accettato come compromesso per evitare una nuova dipendenza. Nessuna verifica quantitativa formale in questo ciclo — se emergono scarti visibili su tracce reali, va riconsiderato
- **Tracce ad anello/autointersecanti** — mitigato con ricerca locale del closest point attorno all'ultimo `trackProgress` noto (vedi Requisiti); resta un rischio residuo se il fallback a ricerca globale si attiva in modo errato (es. dopo una lunga perdita di fix GPS con successivo salto di posizione legittimo) — da verificare in test manuale su almeno una traccia ad anello reale prima del merge
- **`SlopeChartComponent` — coordinamento marker/hover** — mitigato con hook `afterDraw` dedicato e `ctx.save()`/`ctx.restore()` accoppiati, separato da `beforeTooltipDraw` esistente; verifica manuale esplicita richiesta (vedi Requisiti) prima del merge, poiché non esiste test automatico a rete di sicurezza (nessuno spec file per `slope-chart.component.ts` oggi)
- **Ricreazione del chart Chart.js ad ogni fix GPS** — mitigato vincolando l'aggiornamento del marker a un redraw leggero, non a `_createChart()`; se in implementazione risultasse comunque necessario un ngOnChanges pesante, va segnalato come deviazione in notes.md
- **Distanza dell'utente dalla traccia (fuori percorso)** — mitigato con soglia di attivazione a 100m (default, tarabile in seguito): oltre questa distanza il dato non viene mostrato. Il valore 100m è una stima iniziale, non validata su dati reali di produzione — potrebbe risultare troppo stretto (GPS accuracy scarsa in bosco può facilmente superare 100m anche stando sul sentiero) o troppo largo; da rivedere dopo il primo utilizzo reale
- **Geometria `MultiLineString`** — `getRemainingDistance` assume `LineString` semplice, stesso vincolo già esistente e accettato in produzione da `SlopeChartComponent.currentTrack` (che oggi funziona già solo con `LineString`); non è un rischio nuovo introdotto da questa feature, ma un vincolo preesistente del tipo `WmFeature<LineString>` su cui la feature si appoggia
- **Nessun feature flag** — la feature, una volta rilasciata, è attiva per tutti gli utenti con GPS attivo entro 100m dalla traccia su `track-properties`; un bug in produzione richiede un nuovo rilascio mobile (no rollback remoto), a differenza di altri meccanismi del repo basati su `config.json` runtime
- **Assenza di test automatici** — nessuno dei moduli toccati (`slope-chart`, `track-properties`, store `user-activity`) ha oggi test in CI (esclusione nota per crash `NG0201`, vedi oc:8023); la verifica di correttezza per questo ciclo si basa su test manuale su device reale, non su una rete di regressione automatica

## Out of scope

- Navigazione turn-by-turn
- Estensione a `ugc-track-properties` (traccia UGC salvata) — possibile iterazione futura
- Estensione a `draw-ugc` (registrazione live di una nuova traccia)
- Nuova dipendenza turf.js
- Feature flag / disattivazione runtime della feature
- Test automatici (Karma/Cypress) per i nuovi moduli — verifica manuale per questo ciclo
- Validazione quantitativa formale dell'errore Web Mercator vs geodetico su dataset reale
- Gestione esplicita del salto di posizione dopo lungo periodo app in background/schermo bloccato (accettato come caso limite del comportamento GPS generale)

## Moduli toccati

**wm-types (submodule):**
- `src/config.ts` — nuovo campo opzionale `OPTIONS.showTrackRemainingDistance?: boolean`, gate esplicito richiesto dal developer per il componente `wm-track-remaining-distance` (il marker/pendenza sul grafico altimetrico NON è dietro questo flag)

**map-core (submodule):**
- `src/directives/track.directive.ts` — fix bug preesistente (non introdotto da oc:8177, ma reso più visibile dal nuovo timer di dismissal): il pallino e il segmento evidenziato sulla mappa, disegnati durante l'hover sul grafico altimetrico, non venivano mai rimossi quando l'hover terminava

**wm-core (submodule):**
- `projects/wm-core/src/services/geoutils.service.ts` — nuovo metodo `getRemainingDistance` + `prepareRemainingDistanceContext`
- `projects/wm-core/src/store/conf/conf.reducer.ts` — default client-side `showTrackRemainingDistance: true` (temporaneo, per i test — da portare a `false` prima del rollout definitivo)
- `projects/wm-core/src/store/conf/conf.selector.ts` — nuovo selettore `confOPTIONSShowTrackRemainingDistance`
- `projects/wm-core/src/store/user-activity/` (`user-activity.action.ts`, `user-activity.reducer.ts`, `user-activity.selector.ts`, `user-activity.effects.ts`) — nuovo stato/selettore/effect
- `projects/wm-core/src/track-properties/track-properties.component.ts` / `.html` — integrazione nuovo componente sotto `wm-slope-chart`
- `projects/wm-core/src/slope-chart/slope-chart.component.ts` / `.html` — nuovo `@Input() trackProgress`, disegno marker su canvas
- Nuovo componente `wm-track-remaining-distance`, in `projects/wm-core/src/track-remaining-distance/`
- `projects/wm-core/src/constants/track-remaining-distance.ts` — costanti condivise della feature
- `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts` — nuove chiavi i18n per il nuovo componente

## Stima

10h (già approvata e salvata su Orchestrator)
