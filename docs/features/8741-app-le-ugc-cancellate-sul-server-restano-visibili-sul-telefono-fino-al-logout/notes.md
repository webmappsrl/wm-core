> Ticket: oc:8741

# Notes — App: le UGC cancellate sul server restano visibili sul telefono fino al logout

## Deviazioni dal piano

Le deviazioni di sostanza sono nella sezione «Divergenze dal piano, task per task». Due dettagli tecnici:

- **Niente `flatMap` in `ugc-reconcile.ts`**: la configurazione TypeScript degli spec di wm-core non
  include `es2019` (`TS2550: Property 'flatMap' does not exist`). Gli URL si uniscono con un
  `reduce` + `concat` in un helper privato `_mediaUrlsOf`.
- **Funzioni di localForage non spiate direttamente**: come previsto nel piano, negli spec del
  service si spiano le istanze `synchronizedUgcTrack`/`synchronizedUgcPoi`/`synchronizedImg`
  (`keys`, `getItem`, `removeItem`), perché le funzioni esportate sono import ES diretti.

## Divergenze dal piano, task per task

### Task 1 funzione pura di riconciliazione

Il file `ugc-reconcile.ts` previsto dal piano non esiste più. Due giri di modifiche, entrambi su
richiesta del developer:

1. **Letture in più** (dopo la review finale del branch): la prima versione faceva rileggere a
   ogni sync tutte le tracce e tutti i POI sincronizzati tre volte, prima era una per tipo. La
   funzione pura è stata divisa in due — UGC da togliere, immagini da cancellare — così l'altro
   tipo si legge solo quando serve.
2. **Niente file separato** (dopo `wm-review-ticket`): nel modulo UGC gli helper sono metodi
   privati del service (`_isFeatureModified`, `_cleanExifData`), testati con
   `(service as any)._metodo(...)`. Le due funzioni sono diventate `UgcService._findUgcToRemove` e
   `UgcService._findImgUrlsToRemove`. `getUgcMediaUrls` è in `utils/localForage.ts`, esportata, e
   la usa anche `saveUgcImagesByStorage`: il criterio con cui le immagini si salvano e quello con
   cui la riconciliazione le cancella stanno in un punto solo. I test sono in
   `ugc.service.spec.ts` e `localForage.spec.ts`.

### Task 2 riconciliazione nei fetch e chiusura del pannello

- **Un solo metodo generico** `_reconcileUgc(ugcType, apiFeatures, localFeatures)` al posto di
  `_reconcileUgcTracks`/`_reconcileUgcPois`, che erano uguali riga per riga. Riceve la lista già
  letta dal fetch prima del ciclo di salvataggio invece di rileggerla: quelle salvate nel ciclo
  sono fra quelle del server, quindi non vanno tolte e i loro URL sono già protetti. Esce subito
  se non c'è nulla da togliere; `_removeUnusedImgs` legge l'altro tipo solo se le UGC tolte hanno
  immagini.
- **La chiusura del pannello è in un effect**, non nel service: `UgcService` non inietta più
  `UrlHandlerService` (un service dati che naviga non ha precedenti nel layer store di wm-core, e
  la chiusura non si vedeva nei DevTools di NgRx). Il service lancia `removedSynchronizedUgc({ugcType,
  ids})` e `UgcEffects.closeRemovedCurrentUgc$` confronta gli id con `currentUgcTrack`/
  `currentUgcPoi` e chiama `updateURL`.
- **Rimozioni fallite**: `removeSynchronizedUgcTrack/Poi` restituiscono `boolean` (prima
  `handleAsync` inghiottiva l'errore). Una UGC la cui rimozione fallisce non viene notificata e
  le sue immagini restano protette.
- **Lettura fallita dell'altro tipo**: nuove `getSynchronizedUgcTracksOrNull`/`PoisOrNull`, che
  restituiscono `null` invece di `[]`; in quel caso, o con voci illeggibili, non si cancella
  nessuna immagine.
- `cloudUgcPois` rinominato `synchronizedUgcPois`: sono dati locali, non del server.

## Bug trovati

Nessuno nel codice. Un problema d'ambiente sui test, vedi sotto.

## Decisioni

- **Tag Orchestrator non associati** in questo ciclo, su indicazione del developer («lascia stare i
  tag per adesso»). I candidati trovati erano `wm-core` (id 627) e `webmapp-app` (id 612).
- **Riconciliazione solo per id**, il telefono rispecchia il server: due UGC del server con lo
  stesso uuid restano entrambe. La deduplica è del server (oc:8718).
- **Immagini**: si cancellano solo gli URL che nessuna UGC sincronizzata rimasta (tracce e POI)
  usa più, perché dopo l'unione di oc:8718 la UGC tenuta può avere le stesse foto di quella tolta.
- **Pannello della UGC aperta**: se viene tolta, si chiude con `updateURL({ugc_track|ugc_poi:
  undefined})`. Il confronto usa l'oggetto in store, non il parametro dell'URL. Il ripiego di
  `getUgcTrack()`/`getUgcPoi()` sull'ultima UGC sincronizzata resta com'è.
- **Branch e PR su `Passaporto`** e non su `develop`: il fix fa parte del pacchetto passaporto
  (scrum del 08/10). Un eventuale cherry-pick su `develop` si valuterà dopo.

## Verifiche

- Prima versione: suite completa di wm-core 592/592.
- Versione finale: spec di `store/features/ugc/` e `utils/localForage.spec.ts` 94/94. La suite
  completa non è stata ripetuta su indicazione del developer; un tentativo intermedio si era
  bloccato su `passport-share-preview.component.spec.ts` (timeout di Jasmine con la macchina
  sotto carico), che da solo passa 33/33.
- Build dell'app (`webmapp-app/core`, `ng build`): riuscita, nessun errore né dipendenza circolare.
- Collaudo manuale con l'utente 3680 sul dev di camminiditalia: **da fare**, con Giuseppe.

## Follow-up

- **Rilievi della review, non applicati:**
  - nel ramo del 404 in update, `updateCurrentUgcTrackAfterUpdate$` rilancia `currentUgcTrackId`
    dopo la chiusura del pannello: per circa 100 ms può comparire l'ultima traccia sincronizzata
    (il ramo del 404 è fuori scope);
  - il ciclo di fetch già esistente (`track.properties.uuid`) va in errore se localForage
    restituisce una voce `null`, e in quel caso la riconciliazione non parte;
  - il pannello può ancora mostrare un'altra UGC se l'utente tocca il POI tolto nei secondi fra
    la riconciliazione dei POI e il ricaricamento della lista, che avviene a fine sync dopo le
    tracce;
  - test: fixture duplicate e alcuni spy superflui negli spec;
  - checkbox di `plan.md` non spuntate.
- **Ticket da valutare**: il difetto di fondo è il ripiego di `getUgcTrack()`/`getUgcPoi()`
  sull'ultima UGC sincronizzata quando l'id richiesto non esiste. Questo ticket ne copre il
  sintomo (chiudendo il pannello), come il ramo del 404 in update.

- **Spec che importano `UrlHandlerService` e Karma su macchina carica**: con quell'import il bundle
  dei test cresce e, con load average intorno a 30, il caricamento supera il ping timeout di Karma
  (`Disconnected reconnect failed before timeout of 2000ms (ping timeout)`), prima che parta
  qualunque test. Lo spec esistente `url-handler.service.spec.ts` passa al limite (circa 30 s). In
  questa sessione i test sono stati lanciati con una configurazione temporanea fuori dal repo che
  alza `pingTimeout`/`browserNoActivityTimeout`. Da valutare se alzarli in `karma.conf.js`.
