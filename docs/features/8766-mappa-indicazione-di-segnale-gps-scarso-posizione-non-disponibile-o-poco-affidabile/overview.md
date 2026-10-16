> Ticket: oc:8766

# Mappa: indicazione di segnale GPS scarso, posizione non disponibile o poco affidabile

## Cosa cambia

`GeolocationService` espone uno **stato del GPS** che oggi non esiste: in attesa del primo fix,
buono, scarso, permesso negato, localizzazione spenta, watcher fermo. L'interfaccia che lo mostra è
dell'app (`webmapp-app`), vedi l'overview omonima in quel repo: qui c'è solo lo stato, senza
componenti, testi né eventi PostHog. Nella webapp, che monta questo servizio tramite
`wm-geobox-map`, lo stato viene calcolato ma nessuno lo legge.

Si corregge anche il watcher web, che oggi non viene mai chiuso e si duplica a ogni cambio di
modalità.

## Perché

L'app deve spiegare all'utente perché il pallino della posizione non compare o è impreciso
(richiesta di Cammini d'Italia, call del 12/10/2026, estesa a tutte le istanze dell'app). Oggi il
servizio non ha nulla da dire: il watcher nativo scarta gli errori (`if (error) return;`, riga
284), quello web ha la callback d'errore vuota (riga 314) e nessun timeout. Il plugin
`@capacitor-community/background-geolocation` già segnala il permesso negato e, su Android, la
localizzazione spenta (`NOT_AUTHORIZED`), e ogni posizione porta la sua `accuracy`.

## Requisiti

- [ ] Uno stato del GPS esposto come observable, accanto a `onLocationChange$`, con i valori
      `searching`, `ok`, `poor`, `denied`, `disabled`, `off`
- [ ] `searching` all'avvio del watcher, `ok` al primo fix (`poor` richiede due fix di fila), `off` ogni volta che il
      watcher viene fermato (`stopAll()`, background fuori dalla registrazione)
- [ ] **Isteresi:** entra in `poor` quando l'`accuracy` supera **50 m** per **due fix di fila**;
      ne esce dopo **15 secondi** con `accuracy` **sotto i 30 m**, con un timer che parte al primo
      fix buono e si azzera a ogni fix sopra i 30 m. Fra 30 e 50 m lo stato non cambia
- [ ] Il timer d'uscita scade anche senza altri fix: con `distanceFilter` a 10 m chi sta fermo non
      riceve aggiornamenti, e il silenzio non è un segnale perso
- [ ] La logica degli stati è una **funzione pura** (posizione o errore + stato → nuovo stato) in un
      file suo; il servizio la chiama dentro un `try/catch`, così un suo errore non blocca mai
      `_onLocationUpdate` né `_addLocationToRecording`
- [ ] Errori nativi: solo `NOT_AUTHORIZED` cambia lo stato — `Location services disabled.` (solo
      Android) → `disabled`, altrimenti → `denied`; gli errori senza codice sono ignorati
- [ ] Errori web: `PERMISSION_DENIED` → `denied`, `POSITION_UNAVAILABLE` → `disabled`, `TIMEOUT`
      lascia lo stato com'è
- [ ] Watcher web: `clearWatch` del precedente prima di aprirne uno nuovo, e anche in
      `_stopWatcher`; `enableHighAccuracy: true` anche in navigazione, come il nativo
- [ ] Al ritorno dalle impostazioni con il permesso concesso o la localizzazione accesa, il watcher
      riparte e lo stato torna `searching`. Il comportamento dipende dalla piattaforma:
      - **iOS:** su `denied` il plugin ferma il watcher, che quindi viene staccato e ricreato da
        `_startWatcher` al ritorno nell'app;
      - **Android:** il watcher non si stacca mai su `NOT_AUTHORIZED`: con la sola posizione
        approssimativa continua a consegnare fix, e il plugin lo riattiva da sé quando il permesso
        viene concesso. Un `NOT_AUTHORIZED` di permesso arrivato dopo un fix si ignora (con la sola
        approssimata arriva quando l'utente chiude la finestra di sistema); quello di
        localizzazione spenta vale sempre;
      - **web:** il watcher del browser non riparte da solo dopo un errore; `startNavigation()` lo
        riapre se lo stato è `denied` o `disabled`
- [ ] Le callback di un watcher nativo già staccato si ignorano (contatore di generazione): un
      errore in ritardo non deve toccare il watcher attivo
- [ ] Gli errori arrivati con lo stato `off` si ignorano
- [ ] `gpsStatus$` è in sola lettura; il valore attuale si legge con il getter `gpsStatus`
- [ ] Per aprire le impostazioni si usa `openAppSettings()`, che esiste già: nessun metodo nuovo
- [ ] Soglie come costanti, non da `config.json`
- [ ] `stale: false` resta invariato
- [ ] Il comportamento esistente di posizione e registrazione non cambia: lo stato si aggiunge, non
      filtra né ritarda le posizioni
- [ ] Test unitari sulla funzione degli stati: isteresi, due fix di fila, timer d'uscita anche senza
      fix successivi, mappatura degli errori nativi e web, errori senza codice ignorati, `off`

## Rischi

- Prima del primo fix non si distingue un segnale scarso da una partenza a freddo: i plugin non
  espongono satelliti né intensità del segnale. `searching` non va presentato come segnale scarso.
- **Segnale perso dopo il primo fix, limite accettato:** con `distanceFilter` a 10 m il plugin non
  manda posizioni a chi sta fermo, e su Android `onLocationAvailability` finisce solo nel log del
  plugin. Lo stato resta l'ultimo noto.
- iOS non distingue il permesso negato dalla localizzazione spenta: entrambi arrivano come
  `NOT_AUTHORIZED` con `"Permission denied."`, quindi su iOS `disabled` non compare mai.
- `_startWatcher` non riparte se `_watcherId` è già valorizzato: dopo un permesso negato va
  verificato che il watcher venga rimosso e ricreato al ritorno dalle impostazioni.
- Il cambio del watcher web (chiusura del precedente, alta precisione in navigazione) tocca anche la
  webapp: in navigazione il primo fix è più lento al chiuso e il consumo di batteria un po' più alto
  sui browser mobile; va provato che posizione e registrazione da browser restino invariate.
- Il ciclo di vita del watcher nativo dipende dal comportamento del plugin
  `@capacitor-community/background-geolocation` 1.2.26 per piattaforma (vedi sopra): un suo
  aggiornamento va riprovato su Android e iOS.
- Nessun interruttore remoto: spegnere la feature richiede un revert e una nuova release.

## Out of scope

- Qualsiasi interfaccia, testo, traduzione o evento PostHog: sono dell'app.
- Riconoscere il segnale perso ricevendo le posizioni a intervalli di tempo (`distanceFilter: 0` nel
  plugin, filtro dei 10 m nel nostro codice): follow-up da valutare.
- Soglie configurabili da `config.json`.
- Satelliti e intensità del segnale tramite plugin nativo.

## Moduli toccati

- `projects/wm-core/src/services/geolocation.service.ts`
- `projects/wm-core/src/utils/gps-status.ts`, con il suo spec
- `projects/wm-core/src/services/geolocation.service.spec.ts`, nuovo
