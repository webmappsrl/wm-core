> Ticket: oc:8470

# Link da sito non funziona su cell

## Cosa cambia

Due fix mirati nel percorso **web** dell'app (non nativo/Capacitor):

1. **`UrlHandlerService.initialize()`** (wm-core): `this._currentQueryParams$.next(params)` viene spostato in testa al blocco, **prima** di qualsiasi `this._store.dispatch(...)`. Oggi è l'ultima istruzione — quando il dispatch di `currentEcLayerId` scatena sincronamente (via effect NgRx) una risposta che porta `HomePage` a chiamare `changeURL('map')`, quella chiamata legge ancora il valore *precedente* di `_currentQueryParams$` (i query param non sono ancora stati aggiornati), perdendo `track`/`layer` nell'URL finale.
2. **`HomePage`** (repo principale, `home.page.ts`): la subscription reattiva che oggi naviga su `map` solo quando `currentEcLayer`/`ugcOpened` diventano non-null viene estesa a `currentEcTrack`/`currentEcPoi` — stesso pattern già esistente, solo ampliato. Senza questo, un link con `track`/`poi` (senza `layer`) non fa mai navigare l'utente fuori da Home: la traccia viene caricata nello store ma nessuna UI la mostra (il pannello dettaglio traccia esiste solo in `map.page.html`).

## Perché

Il ticket oc:8470 segnala che un link come `https://sentieri.caiparma.it/?track=89812&search=borello`, aperto da smartphone, non mostra la traccia. L'investigazione ha attraversato più livelli prima di arrivare qui:

- **Causa infrastrutturale (già risolta, fuori da questo repo)**: due bug di configurazione Apache facevano sì che, per user-agent mobile, il redirect verso l'infrastruttura web condivisa (`*.mobile.webmapp.it`) fosse corrotto (`/index.html` al posto del path/query originali), causando un crash Angular (`NG04002`) ancora prima che l'app potesse processare l'URL. Diagnosticati e corretti in produzione via SSH — vedi `notes.md`.
- **Causa applicativa (oggetto di questo overview)**: una volta risolto il bug infra, l'app Angular (la stessa identica web app, servita sia a desktop che a mobile una volta corretto il redirect) riceve correttamente `?track=...&search=...`, ma **nessun meccanismo esistente naviga da Home a Map quando il parametro è `track`/`poi` invece di `layer`** — e anche quando lo fa (`layer`), una race condition nell'ordine delle operazioni di `UrlHandlerService.initialize()` fa perdere i query param nell'URL finale.

**Nota su un percorso di codice esplorato e poi scartato**: durante l'investigazione era stato temporaneamente considerato (e parzialmente implementato, poi scartato) un fix in `UrlHandlerService.handleDeepLink()` — il metodo invocato dal listener nativo Capacitor `App.addListener('appUrlOpen', ...)` per Universal Link/App Link. Quel percorso di codice **non si attiva mai** quando un link viene aperto in un browser/PWA (che è il caso reale qui, dato che il problema riportato è sulla pagina web, non sull'app nativa installata) — il developer ha confermato che l'esperienza reale degli utenti che aprono link condivisi è quella web, non quella nativa. Il lavoro su `handleDeepLink()`/`appUrlOpen` (oc:7980, mai esistito su `develop`) è stato scartato integralmente, nessuna traccia nel codice finale.

## Requisiti

- [ ] Aprendo `?track=<id>&search=<termine>` (senza path esplicito), l'app naviga da Home a Map e mostra il dettaglio della traccia `<id>`
- [ ] Aprendo `?poi=<id>` (senza path esplicito), l'app naviga da Home a Map e mostra il dettaglio del POI `<id>`
- [ ] Aprendo `?layer=<id>` (comportamento preesistente, layer): l'URL finale su `/map` **conserva** i query param originali (oggi li perde per la race condition) — es. se erano presenti anche `track`/`search`, restano nell'URL dopo la navigazione
- [ ] Nessuna regressione sul comportamento preesistente per `ugcOpened` (apertura form UGC) e per la navigazione dichiarativa già esistente (`setTrack()`, `setLayer()`, `setPoi()` chiamati da interazioni UI dirette)
- [ ] Un link con **solo** `search` (nessun `track`/`poi`/`layer`) continua a restare su Home come oggi (nessuna regressione sulla ricerca)

## Rischi

- **Basso, cambio isolato e minimale**: 2 righe spostate in `initialize()` (nessuna logica nuova, solo riordino), 2 righe aggiunte a un `merge()` già esistente in `HomePage` (stesso pattern del layer, non un meccanismo nuovo).
- **`currentEcTrack`/`currentEcPoi` si risolvono sempre in modo asincrono** (via `getEcTrack()`/chiamata HTTP, mai sincrono come il layer — verificato in `ec.service.ts:46`, `getEcTrack` ritorna `of(null)` sincrono solo per id `null`, altrimenti passa sempre da una `Promise.then()`) — quindi l'estensione a track/poi in `HomePage` non introduce lo stesso tipo di race condition già vista per il layer; il fix su `initialize()` resta comunque necessario per il caso layer (sincrono) e per robustezza generale.
- **`HomePage.merge()` reagisce anche a interazioni UI dirette** (click su un risultato di ricerca in Home, non solo query param iniziali) — verificato che questo è già il comportamento esistente per `layer`/`ugcOpened` (stesso meccanismo, non introduce un caso nuovo).

## Out of scope

- Redesign dello schema URL (path→query param) — scartato in un ciclo precedente di reverse-interaction, blast radius sproporzionato.
- `handleDeepLink()`/wiring `appUrlOpen` (oc:7980) — esplorato e poi scartato per intero, vedi "Perché" sopra e `notes.md` per il dettaglio della decisione.
- Fix dei vhost Apache — già risolti in produzione via SSH, fuori da qualsiasi repo git. Vedi `notes.md`.
- Guardia su `onRecord`/`drawOpened` (registrazione GPS/disegno in corso) per la navigazione di `HomePage` — non applicata qui: il meccanismo esistente per `layer`/`ugcOpened` non ha mai avuto questa guardia, ed estenderla ora solo per track/poi introdurrebbe un'asimmetria nel comportamento del `merge()` senza una richiesta esplicita in questo ciclo.

## Moduli toccati

- `wm-core/projects/wm-core/src/services/url-handler.service.ts` (repo `wm-core`) — `initialize()`, riordino di due righe + commento sull'invariante.
- `core/src/app/pages/home/home.page.ts` (repo principale `webmapp-app`) — estensione del `merge()` reattivo a `currentEcTrack`/`currentEcPoi` (da `ec.selector`), predicato `filter` condiviso.
- `core/tsconfig.spec.json`, `core/angular.json` (repo principale) — aggiunto `src/app/pages/home` e `src/app/pages/map/map-details` all'`include` dei test (path espliciti e separati da `src/app/services`, non un allargamento del wildcard oc:8023) per rendere eseguibili i nuovi spec.
- `core/src/app/pages/map/map-details/map-details.component.ts` (repo principale) — rimosso `skip(1)` dalla subscription a `featureOpened$` in `ngAfterViewInit()`: un feature già selezionato al momento del mount (deep-link/query-param iniziale) deve aprire il pannello, non solo una transizione osservata dopo. Trovato testando manualmente `?poi=<id>` dopo Task 1+2.
