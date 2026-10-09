> Ticket: oc:8743

# App: dettagli tecnici e mappa delle tracce UGC dai dati del server, calcolo al volo con la stessa pulizia GPS se non sincronizzate

## Cosa cambia

Con oc:8742 il server calcola i dati tecnici di una traccia UGC in `properties.stats` e ricostruisce
la geometria tenendo solo i punti GPS buoni (pulizia di oc:8719). La specifica è di wm-package,
`docs/knowledge/dati-tecnici-delle-tracce-ugc.md` (branch `develop`).

Questo repo diventa **l'unico punto dell'app in cui stanno la pulizia GPS e il calcolo dei dati
tecnici**, scritti seguendo quella specifica alla lettera:

- una funzione pura di pulizia: da `properties.locations` ai punti tenuti (sospetto se accuracy >
  `max_accuracy`, scartato se dista più di `max_deviation` dal tratto fra il punto tenuto precedente
  e il primo punto buono successivo; (0,0) e coordinate non valide sempre scartati);
- una funzione pura di calcolo, sui punti tenuti, con gli stessi nomi, unità e arrotondamenti di
  `stats`: `distance` (haversine, raggio 6.371.000 m, km a 2 decimali), `duration` e
  `duration_moving` (minuti interi), `avg_speed` (solo tratti in movimento con GPS buono),
  `max_speed` (95° percentile nearest-rank di `speed`, ripiego sulle velocità fra punti), tutti
  arrotondati con `phpRound` (metà lontano da zero);
- una versione incrementale della pulizia, per la registrazione in corso: decide un punto appena è
  decidibile, e tiene in attesa un sospetto finché non arriva il primo punto buono successivo;
- i parametri letti da `GEOLOCATION.record.stats` di `config.json` (selettore `confGEOLOCATION`),
  con i default della specifica (40, 50, 95, 1) se mancano.

Chi usa queste funzioni:

- **Pannello «Dettagli tecnici»** (`ugc-track-data`, condiviso fra app e webapp): se la traccia ha
  `properties.stats` mostra quei valori; altrimenti li calcola al volo dai `locations`. Righe:
  Durata, Tempo in movimento, distanza, dislivello, velocità media, velocità massima. Il dislivello
  viene da `stats.ascent` (DEM) se c'è; prima della sincronizzazione dalla quota GPS dei punti
  tenuti; se `stats` c'è ma `ascent` è ancora `null`, «—».
- **Plancia di registrazione** (`track-recorder`, repo app) e **linea live sulla mappa**: i valori e
  la linea usano solo i punti già decisi. Un sospetto non compare finché non è deciso; il pallino
  della posizione resta quello GPS grezzo.
- **Salvataggio** (`modal-save`, repo app): `geometry` contiene solo i punti tenuti,
  `properties.locations` resta grezzo.
- **Riepilogo dopo il salvataggio** (`modal-success`, repo app): legge gli stessi valori del
  pannello.

Dopo la sincronizzazione la traccia scaricata dal server porta la geometria ricostruita dal backend
e `stats`, e quelli vincono.

## Perché

Il cliente vede, appena finita una registrazione con GPS disturbato, linee e numeri falsati (salti
di centinaia di metri, velocità massime assurde, tempi gonfiati dalle soste). Il server ora li
corregge, ma fino alla sincronizzazione — o per sempre, offline — l'app mostra i suoi calcoli, che
oggi usano tutti i punti e regole diverse (media del campo `speed`, massimo semplice, tempo
dal primo all'ultimo punto). Nelle call del 08/10 Giuseppe Bonfanti ha chiesto che l'app mostri
`stats` quando c'è («se hai il valore non lo calcoli, lo visualizzi») e che, quando calcola, lo
faccia «mutuando» la regola del backend, con default identici a wm-package.

## Requisiti

- [ ] Pulizia e calcolo stanno in un solo servizio/modulo di wm-core; nessun altro punto dell'app o
      della webapp li ricalcola.
- [ ] Le funzioni passano tutti i 9 casi delle fixture condivise di wm-package
      (`tests/fixtures/ugc-track-stats/`), copiate in wm-core con il README e il commit di origine
      (`295ad87a2304f5779bc09d8747c4ef6326d68740`, branch `develop`): punti tenuti
      (`expected_kept`) e valori (`expected`) identici.
- [ ] La versione incrementale, applicata punto per punto, produce alla fine gli stessi punti
      tenuti della funzione su tutta la lista (verificato sulle stesse fixture).
- [ ] Allo stop della registrazione i sospetti ancora in attesa si decidono con la stessa regola
      della funzione completa (senza ancora destra: distanza dall'ultimo punto tenuto), così la
      geometria salvata coincide con quella calcolata su tutta la lista.
- [ ] Alla ripresa dopo un crash (`resumeRecordingFromSaved`) lo stato della pulizia si ricostruisce
      dai `locations` salvati, e la linea live riparte dai soli punti tenuti. Oggi
      `geobox-map.component.html:21` lega `WmMapTrackRecordInitLocations`, che la direttiva di
      map-core montata non ha (l'errore non emerge per `CUSTOM_ELEMENTS_SCHEMA`): la linea non
      viene ridisegnata dopo la ripresa.
- [ ] La linea live riceve sempre l'elenco completo dei punti tenuti, non un punto alla volta: un
      sospetto deciso insieme al punto buono successivo produce due punti in una sola emissione.
- [ ] Arrotondamento sempre con `phpRound`, mai `Math.round` o `toFixed`.
- [ ] `IGEOLOCATION.record` ha il campo opzionale `stats`; se manca o è incompleto valgono i default
      della specifica §7.
- [ ] Il pannello mostra `properties.stats` quando c'è, altrimenti i valori calcolati al volo.
- [ ] Il pannello ha le righe «Durata» e «Tempo in movimento», tradotte in de, en, es, fr, it, pr,
      sq (chiave = testo italiano; «Durata» esiste già).
- [ ] Corretto `en.ts`: 'Velocità massima' oggi tradotto come 'Minimum speed'.
- [ ] La linea live sulla mappa disegna solo i punti tenuti; la geometria salvata coincide con
      quella disegnata a fine registrazione.
- [ ] Una traccia senza `locations` (file caricati) e senza `stats` continua a mostrare quanto
      mostra oggi, senza errori.
- [ ] [UX] Un valore `null` si mostra «—», mai `0`; il layout non salta quando un valore arriva (per
      esempio il dislivello DEM qualche secondo dopo la sincronizzazione).
- [ ] [UX] Il passaggio dai valori locali a quelli del server avviene senza animazioni vistose.
- [ ] [UX] Etichette chiare e distinte per le due durate.

## Rischi

- [UX] I numeri cambiano dopo la sincronizzazione: il dislivello passa dalla quota GPS al DEM
  (traccia 174: 481 m → 313 m). È atteso e documentato nella specifica (§10); non si aggiunge una
  spiegazione nell'interfaccia.
- [UX] La velocità attuale nella plancia viene dal GPS grezzo e può superare la velocità massima
  calcolata sui punti puliti.
- Divergenza dal backend se la specifica cambia: le fixture copiate fanno da contratto, il commit di
  origine dice da dove riallinearle.
- Costo del calcolo al volo su tracce lunghe (migliaia di punti) a ogni apertura del pannello.
- Il dislivello DEM arriva con il fetch successivo: la sincronizzazione gira ogni 60 s
  (`ugc.effects.ts:72`) e `_isFeatureModified` confronta anche le properties, quindi lo `stats`
  aggiornato sostituisce quello con `ascent` null al giro dopo, se l'app è online.
- Le tracce sincronizzate prima del deploy di oc:8742 ricevono `stats` solo dopo il command
  `wm:clean-ugc-track-geometry` lato server (specifica §9); fino ad allora app e webapp calcolano al
  volo dai `locations`.

Considerati e ritenuti improbabili nella challenge: GPS sopra `max_accuracy` per minuti interi (la
linea live si ferma finché non arriva un punto buono; secondo la specifica il 90% delle tracce ha il
GPS entro 40 m per almeno il 99% del tempo); `phpRound` diverso da PHP su valori al limite (coperto
dalle fixture); tracce legacy con `locations` dentro `metadata` (`localForage.ts:281`, già oggi
mai riconosciute).

## Out of scope

- Avviso di segnale GPS scarso durante la registrazione (possibile sviluppo futuro: un indicatore
  nella plancia con soglia `max_accuracy`).
- Uso di `stats` e delle due durate nell'immagine di condivisione sui social.
- Spiegazioni nell'interfaccia sulla differenza fra dislivello GPS e DEM.
- La pausa della registrazione: oggi ferma solo il cronometro, i punti continuano a essere raccolti
  e contano in distanza, durata e velocità sia nell'app sia sul server. Possibile ticket separato,
  da decidere con il backend.
- Quote minime/massime, di partenza e di arrivo nel pannello.

## Moduli toccati

- `services/` — nuovo modulo di pulizia e calcolo (funzioni pure + versione incrementale), con spec
  Karma sulle fixture.
- `services/geoutils.service.ts` — i metodi di calcolo delle tracce UGC usati dal pannello vengono
  sostituiti dal nuovo modulo (quelli usati da altri, per esempio la distanza rimanente, restano).
- `services/geolocation.service.ts` — espone i punti tenuti della registrazione in corso.
- `geobox-map/geobox-map.component.ts|html` — alimenta la linea live con l'elenco dei punti tenuti,
  anche alla ripresa dopo un crash.
- `ugc-details/ugc-track-data/` — legge `stats` o calcola al volo; righe nuove.
- `types/config.ts` — `stats` in `IGEOLOCATION.record`.
- `localization/i18n/*.ts` — «Tempo in movimento», correzione di `en.ts`.
- Fixture in una cartella di test (con README e commit di origine).
