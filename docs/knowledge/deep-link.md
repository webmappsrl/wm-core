# Deep link: percorso web e percorso nativo

## Come funziona oggi

`wm-core` espone due ingressi per un link esterno, e servono casi diversi.

**Percorso web** — un link aperto in un browser o nella PWA. Lo legge `UrlHandlerService.initialize()`, che dispatcha allo store gli id trovati nei query param. Qui vale un'invariante, con un commento sopra che la dichiara: `_currentQueryParams$.next(params)` è la **prima** istruzione, prima di ogni `dispatch()`.

**Percorso nativo** — `UrlHandlerService.handleDeepLink(url)` (`url-handler.service.ts:184`) inoltra qualunque path e query param al router, esclude `ugc_track`/`ugc_poi` perché sono dati personali, e captura un evento `deepLinkOpened`. Non si attiva da solo: lo invoca il consumer dal listener Capacitor `appUrlOpen`, quindi solo su app nativa installata.

**Cosa succede dopo il dispatch non è di wm-core.** Se e come si navighi verso la mappa, quale pannello si apra, quale componente reagisca allo store: lo decide il consumer. Chi indaga un link che non porta dove dovrebbe, dopo aver escluso l'invariante qui sopra, deve guardare nel repo del prodotto — e i due prodotti che montano `wm-core` si comportano diversamente.

## Perché così

- **Il percorso nativo non è quello da cui partire quando un link web non funziona** (oc:7980 → oc:8470): durante l'indagine su oc:8470 si era lavorato a lungo su `handleDeepLink()`, prima di accorgersi che da un browser non viene **mai** invocato — è raggiungibile solo da `appUrlOpen`, e il developer ha confermato che l'esperienza reale di chi apre un link condiviso è quella web. Il `notes.md` di oc:8470 dice «scartato integralmente, nessuna traccia nel codice finale»: si riferisce alle modifiche di quel ciclo, non al metodo, che resta in piedi per il suo caso d'uso nativo. È la ragione per cui questa pagina esiste: senza, la prossima investigazione su un link web ripartirebbe da lì.
- **L'ordine in `initialize()` era una race condition** (oc:8470): con `_currentQueryParams$.next(params)` come ultima istruzione, il dispatch di `currentEcLayerId` scatenava sincronamente — via effect NgRx — una `changeURL('map')` che leggeva ancora i query param precedenti, perdendo `track`/`layer` dall'URL finale. È l'unico fix di quel ticket che sia stato mergeato in questo repo (`0fa0067`); il resto viveva nel consumer ed è rimasto in un working tree. Il riordino resta comunque la correzione giusta per qualunque consumer reattivo, presente o futuro.

## Prima di cercare nel codice Angular

Il ticket oc:8470 nasceva come «il link da sito non funziona su cellulare», ma la prima causa era **fuori da ogni repo git**: due bug di configurazione Apache corrompevano il redirect per user-agent mobile verso l'infrastruttura condivisa, facendo crashare Angular (`NG04002`) prima ancora che l'app vedesse l'URL. Corretti in produzione via SSH: proxy spostato fuori dal blocco `<Directory>` (dove `mod_dir` generava una subrequest `index.html` anch'essa proxata) e `[L]` → `[END]` nel fallback SPA. Quando un link non funziona solo da mobile, vale la pena escludere l'infrastruttura prima del codice.

## Debito noto

- **Nessun punto unico di orchestrazione**: non c'è un posto che stabilisca cosa deve succedere, in che ordine, quando un feature diventa corrente via URL, e come si spegne alla chiusura manuale. Tre bug della stessa famiglia in un solo ciclo lo rendono più giustificato di prima — ma il posto dove creare quell'orchestrazione è il consumer, non qui.
- **Il resto del flusso non è osservabile da questo repo**: `wm-core` non vede il codice che reagisce ai suoi dispatch, quindi una modifica a `initialize()` o a `handleDeepLink()` va verificata nei consumer. In `webmapp-app` il contesto sta in `docs/knowledge/deep-link.md`.
