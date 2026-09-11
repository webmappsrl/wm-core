> Ticket: oc:8374

# Bug config non ricaricata correttamente (traduzioni/app non partono)

## Cosa cambia

`handleApiCache()` (`utils/api-cache-handler.ts`) smette di dichiarare al server, tramite l'header `If-Modified-Since`, di avere già una cache valida quando in realtà il body non è utilizzabile da IndexedDB (`synchronizedApi`). La condizione si basa sul **dato effettivamente parsato con successo** (`parsedData`), non sulla presenza grezza della entry (`cachedData`): se `synchronizedApi.getItem(url)` risolve `null`, oppure risolve una stringa che poi fallisce il `JSON.parse`, la richiesta HTTP viene fatta **senza** header condizionali, forzando sempre una risposta piena (200) — indipendentemente dal `last-modified` eventualmente ancora presente in `localStorage`.

**Perché il fix deve toccare anche `conf.service.ts` (non solo `api-cache-handler.ts`):** `ConfService.getConf()` oggi pre-costruisce da sé l'header `If-Modified-Since` leggendo `localStorage` (righe 51-56 di `conf.service.ts`), **senza controllare `synchronizedApi`**, e lo passa come parametro `headers` a `handleApiCache`. Nello spread `{'If-Modified-Since': cachedLastModified, ...headers}` (`api-cache-handler.ts:26-28`), l'header passato dal chiamante vince comunque su qualunque logica interna. Se il fix toccasse solo `api-cache-handler.ts`, il bug per `getConf()` — cioè il caso reale segnalato in oc:8357 — continuerebbe a manifestarsi, perché l'header condizionale arriverebbe già pre-costruito, bypassando il controllo interno sulla cache. Il fix quindi rimuove questa costruzione autonoma dell'header in `conf.service.ts`: la decisione se inviare `If-Modified-Since` resta interamente responsabilità di `handleApiCache`, basata sulla cache realmente disponibile.

In aggiunta, la scrittura della cache viene resa coerente tra i due store:
- `synchronizedApi.setItem(url, JSON.stringify(data))` viene atteso (`await`) e il suo esito controllato.
- Se questa scrittura fallisce, `localStorage.setItem(${url}-last-modified, ...)` **non viene eseguito** — evitando di promettere una cache che non esiste, cosa che oggi può accadere perché le due scritture non sono coordinate.

Il fix è nella funzione condivisa `handleApiCache`, quindi si applica anche a `IconsService` (`icons.service.ts`), che la riusa con lo stesso pattern — effetto collaterale positivo non specificamente testato oltre ai test unitari sulla utility comune.

**`ec.service.ts` (`getPois()`, `getEcTrack()`) NON è coperto da questo fix**, contrariamente a quanto inizialmente ipotizzato: sono reimplementazioni manuali indipendenti dello stesso pattern (non chiamano `handleApiCache`), con logica leggermente divergente tra loro. Restano volutamente fuori scope (vedi "Out of scope").

Vengono aggiunti test unitari mirati su `handleApiCache` per coprire esplicitamente questi scenari (cache-miss con 304 dal server; cache presente ma corrotta — `JSON.parse` fallisce; fallimento di `synchronizedApi.setItem`), dato che il bug è una race asincrona intermittente non riproducibile in modo affidabile a mano. Data la duplicazione dell'header in `conf.service.ts`, i test devono coprire anche il comportamento end-to-end di `ConfService.getConf()`, non solo `handleApiCache` in isolamento — un test unitario sulla sola utility passerebbe comunque anche se `conf.service.ts` continuasse a inviare l'header autonomamente.

## Perché

Segnalato più volte da clienti (es. ticket oc:8357, riscontrato anche internamente su Forestas): l'app parte "vuota" — traduzioni mancanti, config assente — perché il client crede di avere già la config in cache (in base al timestamp `Last-Modified` in `localStorage`) e manda `If-Modified-Since` al server, che risponde 304. Ma il body della config non è mai stato scritto (o è andato perso) in IndexedDB. Il branch 304 di `handleApiCache` non emette nulla sull'Observable e lo completa silenziosamente: nessun errore, nessun retry, l'azione NgRx `loadConfSuccess`/`loadConfFail` non viene mai dispatchata e `isConfLoaded` resta `false` per sempre, bloccando anche `checkAppVersion$` e l'inizializzazione di PostHog che dipendono dallo stesso flag.

## Requisiti

- [ ] Se `synchronizedApi.getItem(url)` risolve `null`/vuoto, **oppure** il body risolto non supera il `JSON.parse` (`parsedData` resta `null`), la richiesta HTTP non include l'header `If-Modified-Since` (viene sempre richiesto il body completo)
- [ ] `ConfService.getConf()` non costruisce più autonomamente l'header `If-Modified-Since` da `localStorage` — la decisione resta interamente dentro `handleApiCache`, basata sulla cache realmente disponibile e valida
- [ ] `synchronizedApi.setItem(url, ...)` viene atteso; se fallisce (rejection), `localStorage.setItem(${url}-last-modified, ...)` non viene eseguito in quel ciclo
- [ ] Il comportamento esistente non cambia quando la cache è presente e valida (nessuna richiesta piena superflua)
- [ ] Il fix si applica a `handleApiCache` in modo generico, coprendo `ConfService.getConf()` e, come effetto collaterale, `IconsService`
- [ ] Test unitari nuovi su `handleApiCache` (non esistevano test precedenti su questo file): cache-miss + risposta 304 → richiesta piena alla chiamata successiva; cache presente ma corrotta (parse fallito) + 304 → richiesta piena; `setItem` che rigetta → `last-modified` non viene scritto in `localStorage`
- [ ] Test end-to-end su `ConfService.getConf()` (non solo sulla utility in isolamento) che verifichi che l'header condizionale non venga inviato quando la cache è assente/corrotta — copre il rischio di regressione per duplicazione della logica nel chiamante

## Rischi

- **Scope volutamente limitato al caso diagnosticato** (cache/304 su config): `loadConf$` (`conf.effects.ts`) non ha timeout/retry generale — se l'Observable di `getConf()` non emette mai per un motivo diverso da questo (es. richiesta di rete che non risponde mai, altro errore silenzioso), l'app resta bloccata comunque. Rischio noto, non mitigato in questo ciclo — decisione esplicita del developer per non trasformare un bug fix mirato in un redesign della resilienza di rete.
  - Causa tecnica specifica non ancora coperta: un blocco multi-tab su IndexedDB (`versionchange` transaction pendente in un'altra tab) può far restare la Promise di `synchronizedApi.getItem` pendente indefinitamente — nessuna richiesta HTTP parte, nessun evento emesso, indistinguibile da "sto ancora caricando".
  - Race tra chiamate concorrenti a `getConf()` (es. retry manuale + automatico quasi simultanei): nessun lock su `synchronizedApi`/`localStorage`, il fix riduce la probabilità del bug ma non la elimina del tutto in questo scenario.
- **Nessun handler per `loadConfFail` nel reducer** (`conf.reducer.ts`): resta un gap preesistente, non introdotto né risolto da questo fix — se in futuro `loadConf$` iniziasse a emettere `loadConfFail` in altri scenari, lo stato applicativo non lo rifletterebbe comunque. Fuori scope.
- **`IconsService` viene impattato come effetto collaterale positivo** (stesso fix nella utility condivisa) ma non è stato specificamente testato/validato con dati reali in questo ciclo oltre ai test unitari sulla utility comune. **Rischio aggiuntivo preesistente e distinto**: `icons.effects.ts` ha il proprio `catchError` posizionato fuori dallo `switchMap` (a differenza di `conf.effects.ts`, che lo mette correttamente dentro) — se il fix altera la frequenza con cui `handleApiCache` emette `observer.error(...)` (es. più richieste piene che possono fallire in rete quando la cache è assente), questo effect preesistente rischia di terminare permanentemente dopo il primo errore, disabilitando il caricamento icone per il resto della sessione. Bug preesistente, non introdotto da questo fix, non risolto in questo ciclo.
- **`ec.service.ts` (`getPois()`, `getEcTrack()`) resta con lo stesso bug**, non essendo coperto da questo fix (vedi "Out of scope") — se il sintomo si ripresenta su mappa/POI invece che su config/traduzioni, va trattato come ticket separato.
- **Nessuna telemetria aggiuntiva prevista** per distinguere, post-rilascio, un "cache-miss genuino" da un eventuale aumento anomalo di richieste piene (es. per utenti con connessione lenta o aumento di banda lato server) — un'eventuale necessità di rollback andrebbe valutata senza dati quantitativi diretti sul cambio di comportamento.

## Out of scope

- Aggiunta di timeout/retry generale su `loadConf$` o altri consumer di `handleApiCache`
- Fix di `ec.service.ts` (`getPois()`, `getEcTrack()`) — reimplementazioni manuali indipendenti dello stesso pattern di caching condizionale, non chiamano `handleApiCache`, hanno logica leggermente divergente tra loro. Stesso bug potenzialmente presente, ma richiede un ticket dedicato
- Fix del `catchError` fuori scope in `icons.effects.ts` — bug preesistente e distinto, non introdotto da questo fix
- Gestione dell'asimmetria `localStorage.clear()` / `indexedDB.deleteDatabase()` non awaited in `settings.component.ts` (`clearWebViewData()`) — bug distinto, dietro conferma utente esplicita, non la causa diagnosticata qui
- Schermata o messaggio di errore UI dedicato per il caso "config non disponibile" — il fix risolve la causa alla radice, l'app torna a comportarsi normalmente senza bisogno di un nuovo stato UI
- Aggiunta di un handler per `loadConfFail` nel reducer
- Lock/mutex su `synchronizedApi`/`localStorage` per eliminare la race tra chiamate concorrenti
- Telemetria/logging aggiuntivo per monitorare il volume di richieste piene post-rilascio

## Moduli toccati

- `core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.ts` (fix principale)
- `core/src/app/shared/wm-core/projects/wm-core/src/utils/api-cache-handler.spec.ts` (nuovo — test unitari)
- `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.ts` (rimozione della costruzione autonoma dell'header `If-Modified-Since`)
- `core/src/app/shared/wm-core/projects/wm-core/src/store/conf/conf.service.spec.ts` (nuovo — test end-to-end su `getConf()`)

Impattato come effetto collaterale (nessuna modifica diretta necessaria, stesso fix nella utility condivisa):
- `core/src/app/shared/wm-core/projects/wm-core/src/store/icons/icons.service.ts`

Repo: submodule `wm-core` (`@wm-core/*`). Nessun file del repo principale `webmapp-app` coinvolto.
