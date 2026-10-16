# Dati tecnici e pulizia GPS delle tracce UGC

## Come funziona oggi

Il calcolo è la traduzione della specifica di wm-package,
`docs/knowledge/dati-tecnici-delle-tracce-ugc.md` (commit `295ad87`, branch `develop`): formule,
arrotondamenti e casi limite stanno lì, qui solo come li usa l'app.

- **Dove sta:** `utils/ugc-track-stats.ts` ha tre responsabilità: la pulizia GPS (sulla lista
  intera e incrementale, `UgcTrackCleaner`), le chiavi di `stats` calcolabili in locale e la scelta
  fra server e calcolo locale (`ugcTrackDetails`). Parametri, default e chiavi si leggono lì.
  `UgcTrackStatsService` aggiunge i parametri di `config.json` → `GEOLOCATION.record.stats`.
- **Cosa si mostra:** se la traccia ha `properties.stats` (scritto solo dal server) si mostrano
  quei valori; altrimenti si calcolano al volo dai `locations` con la stessa pulizia. Dislivelli e
  quote (`ascent`, `descent`, `ele_min`, `ele_max`; partenza e arrivo non si mostrano) vengono
  dal DEM del server (`null` per qualche secondo dopo la sincronizzazione → «—»); prima della
  sincronizzazione dalla quota GPS dei punti tenuti. Le righe non seguono i flag
  `OPTIONS.show*`, che riguardano i dati degli ecTrack (camminiditalia li ha tutti a `false`).
  Senza `locations` (file caricati) solo la distanza della geometria.
- **Righe:** `wm-detail-row` (icona, etichetta, valore) è la riga comune a questo pannello e a
  `wm-tab-detail`; quali righe mostrare e come scrivere il valore lo decide ciascun pannello.
- **Consumer condiviso:** il pannello «Dettagli tecnici» (`ugc-track-data`), montato da app e
  webapp. I consumer di un solo prodotto sono documentati nel repo del prodotto.
- **Durante la registrazione:** `GeolocationService` passa ogni punto a `UgcTrackCleaner`.
  `properties.locations` resta grezzo (è ciò che il server ripulisce); `recordedKeptLocations$`
  contiene i punti già decisi ed è ciò che disegna la linea live (`WmMapTrackRecordLocations` della
  direttiva di map-core, sempre l'elenco completo). Un punto sospetto resta in attesa finché non
  arriva il primo punto buono successivo; il pallino della posizione resta il GPS grezzo.
- **Al salvataggio:** il getter `recordedFeature` restituisce la geometria con i soli punti tenuti,
  decidendo anche i sospetti in coda (`keptIfStoppedNow`, senza cambiare lo stato: se il
  salvataggio si annulla la registrazione prosegue uguale). Con meno di 2 punti tenuti usa i punti
  grezzi validi. Dopo la sincronizzazione vincono la geometria e lo `stats` del server.
- **Casi di test condivisi:** `utils/fixtures/ugc-track-stats/`, copiati da wm-package con il
  commit di origine nel README; lo spec li verifica sia con la funzione completa sia con quella
  incrementale.

## Perché così

- **Si mostra `stats` quando c'è, si calcola solo quando manca** (oc:8743): il server è il
  riferimento (DEM per le quote, la sua pulizia per la geometria). Il calcolo locale serve solo
  finché la traccia non è sincronizzata, offline compreso.
- **Calcolo copiato dal backend, non reinventato** (oc:8743): stessa regola, stessi default,
  stesso arrotondamento (`phpRound`, mai `Math.round` o `toFixed`), stessi casi di test. Così i
  numeri non cambiano alla sincronizzazione, salvo il dislivello (quota GPS → DEM).
- **Pulizia anche durante la registrazione** (oc:8743): la linea disegnata deve essere quella che
  si ritrova dopo il salvataggio. La regola completa decide un sospetto guardando il punto buono
  successivo, quindi la linea live lo mostra con quel ritardo.
- **Geometria salvata già pulita, `locations` grezzi** (oc:8743): l'app mostra subito la traccia
  giusta; il server ricalcola comunque tutto dai `locations`.
- **Con meno di 2 punti tenuti, punti grezzi** (oc:8743): una geometria vuota viene scartata da
  `saveUgc` e la registrazione andrebbe persa (succede con il GPS del browser, spesso oltre 40 m).

- **Righe in comune con l'ecTrack, logica no** (oc:8743): `wm-tab-detail` nasconde le righe senza
  valore e ha durate stimate, roundtrip e badge di navigazione; renderlo usabile da entrambi lo
  avrebbe riempito di condizioni. Si condivide solo la riga.

## Come ci siamo arrivati

- **Ogni componente calcolava per conto suo** (fino a oc:8743, superato): `GeoutilsService` di
  wm-core e una sua copia nell'app usavano tutti i punti, la media del campo `speed` e il massimo
  semplice (fino a 1.056 km/h su una camminata). Pannello, plancia e riepilogo potevano mostrare
  numeri diversi per la stessa traccia. Metodi e copia sono stati eliminati.
- **Linea live punto per punto** (fino a oc:8743, superato): la direttiva aggiungeva ogni posizione
  GPS, anche quelle che il server poi scartava, e alla ripresa dopo un crash ripartiva vuota
  (input inesistente nascosto da `CUSTOM_ELEMENTS_SCHEMA`).
- **Durante la registrazione al più un filtro sulla sola accuracy** (proposta iniziale del ticket,
  scartata): avrebbe disegnato una linea diversa da quella salvata.

## Limiti noti

- La pausa ferma solo il cronometro: i punti continuano a entrare nei `locations` e contano nella
  durata, come sul server. Il cronometro della plancia esclude le pause, «Durata» no.
- Il pannello aperto non si aggiorna quando arriva lo `stats` del server: si vede alla riapertura.
