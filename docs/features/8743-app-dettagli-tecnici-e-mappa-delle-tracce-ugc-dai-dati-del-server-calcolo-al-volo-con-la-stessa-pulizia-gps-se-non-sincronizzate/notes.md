> Ticket: oc:8743

# Notes — Dati tecnici e linea delle tracce UGC con la pulizia GPS del backend

## Divergenze dal piano, task per task

### Task 4 parametri e servizio

- `UgcTrackDetails`, `resolveUgcTrackStatsParams` e `ugcTrackDetails` stanno in
  `utils/ugc-track-stats.ts` e non nel file del servizio: sono funzioni pure, testate senza
  TestBed nello stesso spec delle fixture. Il servizio resta il solo punto che legge lo store.
  Non c'è uno spec del servizio (`params$` è un `store.select` con `map`).
- `UgcTrackStatsParams` è definito in `types/config.ts` (dove sta la forma di `config.json`) e non
  nel modulo di calcolo: chiesto in review, per non far dipendere `types/` da `utils/`.
- `resolveUgcTrackStatsParams` applica la stessa validazione del server (§7: 0, negativi e
  percentile > 100 → default), non solo la chiave mancante: emerso in review.

### Task 5 pannello e traduzioni

- La riga «Durata» usa una chiave nuova, `'Durata'`, e non la chiave esistente `duration`, che
  esiste solo in it, en e sq: in de, es, fr e pr il pannello avrebbe mostrato la parola
  «duration». La chiave nuova segue la regola «chiave = testo italiano».
- Il «—» si scrive con un `ng-template #unavailable`, come in riepilogo e plancia (review).

### Task 6 registrazione e linea live

- I parametri non si leggono con `take(1)` all'avvio: `GeolocationService` resta iscritto a
  `params$` e, se la config arriva o cambia a registrazione in corso (la ripresa dopo un crash
  parte all'avvio, prima che la config sia nello store), rifà la pulizia sui `locations` già
  registrati. Emerso in review.
- La pulizia parte da `properties.locations` (`_startCleaner`), non dal punto iniziale della
  geometria: il placeholder `[0,0,0]` di `_getEmptyWmFeature` vive solo nella geometria e non
  entra mai nella pulizia.
- `stopRecording()` restituisce la feature del getter (geometria pulita); l'unico chiamante che
  usa il valore di ritorno, `user-activity.effects.ts`, lo ignora.
- `_isLocationAlreadyRecorded` confronta l'ultima location grezza, non l'ultima coordinata della
  geometria, che non cresce più punto per punto.
- **Geometria con meno di 2 punti tenuti** (bloccante trovato in review): se il GPS è tutto oltre
  `max_accuracy` (tipico della PWA su desktop o al chiuso) la pulizia non tiene nessun punto e la
  geometria usciva vuota; `saveUgc` la scartava in silenzio (`isValidWmFeature`) mentre il
  salvataggio cancellava i punti di recupero. Ora `recordedGeometryCoordinates` usa i punti grezzi
  validi quando i tenuti sono meno di 2.

### Task 7 plancia, riepilogo e pulizia

- La plancia usa `computeUgcTrackLocalStats(...).distance` invece di `lineLengthKm`: stesso
  calcolo, e la velocità media viene dalla stessa chiamata. Senza dati mostra «—» (anche dopo
  `reset()`).
- In `modal-success` i campi `trackAvgSpeed` e `trackTopSpeed` sono tolti invece di essere
  valorizzati: il template non li ha mai mostrati.
- Precisione allineata (review): distanza a 2 decimali in plancia, riepilogo e pannello; velocità
  media a 1 decimale in plancia e pannello.
- Da `GeoutilsService` è stato tolto anche `getLocations()`, rimasto senza chiamanti.

### Dopo i test manuali: discesa e quote nel pannello

- L'overview lasciava fuori le quote (out of scope) e il pannello non leggeva `descent`. Durante i
  test il dev ha chiesto le righe Dislivello negativo, Quota minima e Quota massima, come nel
  pannello dell'ecTrack (Quota di partenza e di arrivo provate e tolte su richiesta del dev). Dallo `stats` del server se c'è, altrimenti dalla quota
  GPS dei punti tenuti (`gpsElevationMeters`, che sostituisce `gpsAscentMeters`). Sempre presenti,
  **senza** i flag `OPTIONS.show*` dell'ecTrack: camminiditalia li ha tutti a `false` per
  nascondere i dati degli ecTrack, e con i flag le righe non comparivano (provato col dev).
- Non si monta `wm-tab-detail`: nasconde le righe senza valore (anche 0) invece di mostrare «—»,
  usa la durata stimata dell'ecTrack e i badge della navigazione live. Per non duplicare il
  markup, la riga (icona, etichetta tradotta, valore) è estratta in `wm-detail-row`, usato da
  entrambi i pannelli; la logica di ciascuno (flag, roundtrip, «—») resta nel proprio template.
  In `wm-tab-detail` restano `ion-item` solo partenza/arrivo e indirizzo, che hanno un layout
  proprio.
- Dimensioni e pesi della riga sono quelli delle sezioni «Form» e «Dove» del dettaglio UGC
  (`--wm-font-mf`, 400/600), anche nel pannello dell'ecTrack, dove prima il valore era a
  `0.6875rem` (richiesta del dev). Le icone in sola lettura della «Form» passano a primary.
- Il pannello UGC prende le icone delle righe dell'ecTrack. Icone
  scelte per le righe che l'ecTrack non ha: `icon-outline-walking` per il tempo in movimento,
  `icon-outline-running` per le velocità.

## Bug trovati

- **Linea live dopo la ripresa:** `geobox-map.component.html` legava `WmMapTrackRecordInitLocations`,
  un input che la direttiva di map-core montata non aveva; `CUSTOM_ELEMENTS_SCHEMA` nascondeva
  l'errore e la linea ripartiva vuota. Risolto dal nuovo input con l'elenco completo.
- **Traduzione inglese:** `'Velocità massima'` era tradotto «Minimum speed».

## Decisioni

- La pausa della registrazione ferma solo il cronometro: i punti continuano a entrare in
  `locations`, nell'app come sul server. Lasciato fuori da questo ticket (decisione del dev).
  Effetto visibile: la durata della plancia (cronometro) può differire da «Durata» (primo-ultimo
  punto), e i punti registrati mentre si compila il salvataggio entrano in `locations` ma non
  nella geometria salvata; dopo la sincronizzazione vince la geometria del server.
- La linea live e la plancia usano i punti già decisi (`kept`); geometria salvata e riepilogo
  decidono anche i sospetti in coda (`keptIfStoppedNow`). La differenza riguarda solo gli ultimi
  punti, ed è la conseguenza voluta di «un sospetto aspetta il punto buono successivo».
- La review formale è stata fatta prima del commit: bloccante e cleanup sono stati corretti
  subito, quindi l'esito non è stato scritto come ciclo «da fare» nel ticket.

## Follow-up

- **Webapp:** aggiornare insieme i submodule wm-core e map-core (il binding della linea live è
  cambiato da entrambe le parti). La copia morta di `ugc-track-data` in wm-webapp
  (`UgcDetailsModule`, non importato da nessuno) usa i metodi tolti da `GeoutilsService`: non
  entra nella build, ma va cancellata.
- **Avviso di segnale GPS scarso** nella plancia (soglia `max_accuracy`): possibile sviluppo.
- **Pausa** che smette di raccogliere punti: da decidere con il backend.
- **`stats` nell'immagine di condivisione** e le due durate: fuori da questo ticket.
- Il pannello aperto non si aggiorna quando arriva lo `stats` del server: si vede alla riapertura
  (comportamento preesistente di `currentUgcTrack`).
- Verifiche manuali da completare: traccia 174 sul server dev, linea live con GPS reale, ripresa
  dopo un crash, registrazione con GPS tutto sospetto.
