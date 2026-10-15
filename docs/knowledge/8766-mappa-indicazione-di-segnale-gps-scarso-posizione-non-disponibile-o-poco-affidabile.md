# Stato del GPS: attesa, segnale debole, permesso negato

## Come funziona oggi

`GeolocationService` espone lo stato del GPS in `gpsStatus$` (sola lettura; il valore attuale con
il getter `gpsStatus`): `searching`, `ok`, `poor`, `denied`, `disabled`, `off`. Lo calcola la
funzione pura `reduceGpsStatus` (`utils/gps-status.ts`) dagli eventi del watcher: avvio, stop, fix,
errori e un `tick` che il servizio programma per l'uscita da `poor`. Il servizio non mostra nulla:
l'interfaccia sta nel prodotto che monta wm-core (nell'app: avvisi e badge sul bottone della
posizione).

Regole che valgono per chiunque lo legga:

- **Isteresi:** si entra in `poor` con l'`accuracy` sopra 50 m per due fix di fila; se ne esce dopo
  15 s di fix sotto i 30 m. Il timer d'uscita scade anche senza altri fix, perché con il
  `distanceFilter` (10 m di default) chi sta fermo non ne riceve.
- **Il primo fix porta sempre in `ok`**: con un solo fix, anche molto impreciso, `poor` non scatta.
- **Gli eventi arrivati con lo stato `off` si ignorano**: vengono da callback in ritardo.
- **Lo stato non tocca posizioni e registrazione**: si aggiorna dopo `_onLocationUpdate` e
  `_addLocationToRecording`, dentro un `try/catch`.

Il watcher nativo si comporta in modo diverso per piattaforma, e il servizio segue il plugin
`@capacitor-community/background-geolocation` 1.2.26:

| | Permesso negato | Solo posizione approssimativa | Localizzazione spenta |
|---|---|---|---|
| **Android** | `NOT_AUTHORIZED`; il watcher resta vivo e il plugin lo riattiva da sé quando il permesso arriva | il plugin rifiuta il permesso (per Capacitor serve anche `FINE`) ma crea comunque il watcher, che consegna fix con `accuracy` molto ampia | `NOT_AUTHORIZED` con `Location services disabled.` → `disabled` |
| **iOS** | `NOT_AUTHORIZED` (`Permission denied.`); il plugin ferma il watcher, che va staccato e ricreato al ritorno nell'app | nessun errore: fix rari e molto imprecisi | come il permesso negato: `denied` |
| **web** | `PERMISSION_DENIED` → `denied`; il watcher del browser non riparte da solo, lo riapre `startNavigation()` | — | `POSITION_UNAVAILABLE` → `disabled` |

Su Android un `NOT_AUTHORIZED` di permesso arrivato **dopo** un fix si ignora: con la sola
approssimata arriva quando l'utente chiude la finestra di sistema, mentre le posizioni arrivano già.
Le callback di un watcher nativo già staccato si scartano con un contatore di generazione.

Il watcher web usa sempre l'alta precisione, anche in navigazione, e ne resta aperto uno solo.

## Perché così

- **Lo stato in una funzione pura** (oc:8766): si testa senza simulare il plugin Capacitor, che è
  un Proxy che `spyOn` non intercetta; il servizio la chiama protetta da `try/catch`, così un suo
  errore non può bloccare posizioni e registrazione.
- **Isteresi e due fix di fila** (oc:8766): un avviso che va e viene a ogni oscillazione
  dell'`accuracy` disturberebbe chi cammina, e una lettura sballata non deve far scattare nulla.
- **Alta precisione anche in navigazione sul web** (oc:8766): con `enableHighAccuracy: false` il
  browser usa Wi-Fi e celle e la posizione risulterebbe sempre scarsa. Costa un primo fix più lento
  al chiuso e un po' di batteria in più, anche nella webapp.
- **`stale: false` invariato** (oc:8766): una posizione vecchia mostrata come attuale, o finita in
  una traccia, è peggio di una posizione assente.

## Come ci siamo arrivati

- **Staccare il watcher nativo su ogni `NOT_AUTHORIZED`** (oc:8766, superata): su Android
  bloccava il pallino di chi aveva concesso solo la posizione approssimativa, che prima del ticket
  continuava a muoversi. Ora si stacca solo su iOS.
- **Leggere il silenzio come segnale perso** (oc:8766, scartata): con il `distanceFilter` il
  silenzio vuol dire anche «fermo». Riconoscere il segnale perso richiede posizioni a intervalli
  di tempo (`distanceFilter: 0` nel plugin, filtro di distanza nel nostro codice): resta da
  valutare.
- **Una soglia «un fix sopra 500 m → subito `poor`»** (oc:8766, scartata): all'avvio a freddo
  Android consegna spesso un primo fix da celle o Wi-Fi di 500-2000 m, e l'avviso comparirebbe a
  ogni apertura.
- **Satelliti e intensità del segnale** (oc:8766, scartata): solo Android li espone (`GnssStatus`),
  iOS no, e servirebbe un plugin nativo da mantenere.
