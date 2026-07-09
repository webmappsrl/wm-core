> Ticket: oc:7980

# QR code deep link per poi, tappa e cammino

## Cosa cambia

`UrlHandlerService` espone un metodo `handleDeepLink(url: string)` che parsa l'URL ricevuto dal listener nativo `appUrlOpen` (implementato nel repo principale, `app.component.ts`) ed estrae **path e query param generici** (non solo `/map`/`track`/`poi`/`layer`/`filter`), navigando con `navigateTo([path], queryParams)` — lo stesso metodo già usato da `setPoi()`/`setTrack()`, per evitare un doppio dispatch NgRx rispetto al normale flusso di navigazione via router. Qualunque route dell'app è quindi raggiungibile da link esterno, non solo la mappa.

## Perché

Il repo principale intercetta l'URL nativo di lancio/risveglio dell'app (Universal Links/App Links), ma il parsing dei parametri e la navigazione verso il contenuto corretto (traccia, POI, cammino/layer) è già centralizzato in questo servizio — riusarlo evita di duplicare la logica di query param già esistente in `setPoi`/`setTrack`/`initialize()`.

## Requisiti

- [ ] Nuovo metodo pubblico `handleDeepLink(url: string)` in `url-handler.service.ts` che estrae **il path e tutti i query param** dall'URL in ingresso (qualunque path, non solo `/map`) e chiama `navigateTo([path], queryParams)` direttamente, senza passare da `updateURL()` (per evitare merge con lo stato precedente in caso di warm start su un contenuto diverso)
- [ ] Parametri esclusi esplicitamente, indipendentemente dal path: `ugc_track`, `ugc_poi` (dati personali, non devono essere raggiungibili da un link pubblico/QR code)
- [ ] Se l'URL è malformato, nessuna azione (nessun redirect, nessun errore) — comportamento silenzioso coerente con la gestione attuale di id inesistenti in `initialize()`. Un URL valido ma senza query param o con path vuoto naviga comunque (es. root senza param → home)
- [ ] Comportamento a warm start identico a quello odierno di `setTrack`/`setPoi`: nessun guard aggiuntivo per stati come registrazione GPS in corso
- [ ] Evento PostHog dedicato in `handleDeepLink()` (es. `deepLinkOpened` con i param ricevuti e un flag di risoluzione riuscita/fallita) per dare visibilità in produzione su QR fisici rotti o link con id non risolvibili — riusa l'infrastruttura PostHog già presente nel servizio (`_posthogClient`), sullo stesso pattern di `_mobileTrackUrlChange()`

## Rischi

- **`filter` non passa da `initialize()`**: oggi `_emptyParams` include `filter` ma `initialize()` non lo dispatcha a nessuna action — il parametro è letto direttamente da `home.component.ts:96-97`. `handleDeepLink()` deve comunque passare `filter` nei `queryParams` di `navigateTo()` (che aggiorna l'URL/route) perché sia poi il componente home a leggerlo, senza reimplementare quella logica qui
- **Doppio ingresso agli stessi query param**: sia `setPoi`/`setTrack` (chiamati da UI interna) sia il nuovo `handleDeepLink` (chiamato da evento nativo esterno) convergono sullo stesso stato URL — va verificato in fase di test che non ci siano race condition se un deep link arriva mentre l'utente sta già navigando manualmente
- **`skip(1)` in `initialize()` (riga 75) potrebbe scartare la primissima emissione di query params a cold start**: se in futuro il deep link venisse fatto passare dalla subscription di `initialize()` invece che da una chiamata diretta a `navigateTo()`, questo skip scarterebbe silenziosamente i parametri del deep link nello scenario più comune (app chiusa, utente scansiona il QR). Con l'approccio attuale (`handleDeepLink()` chiama `navigateTo()` direttamente, non passa dalla subscription) il rischio non dovrebbe presentarsi, ma va validato con un test end-to-end reale su cold start prima del rilascio

## Out of scope

- Listener nativo `appUrlOpen` e guard di cold-start (repo principale, `app.component.ts`)
- Generazione file `.well-known` e injection manifest/entitlements (repo principale, `gulpfile.js`)
- Gestione `ugc_track`/`ugc_poi` via deep link

## Moduli toccati

- `projects/wm-core/src/services/url-handler.service.ts` — nuovo metodo `handleDeepLink(url: string)`
