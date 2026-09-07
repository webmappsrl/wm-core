> Ticket: oc:8470

# Notes — Link da sito non funziona su cell

## Deviazioni dal piano

- **Pivot completo di scope durante l'esecuzione**: il primo piano approvato puntava a `UrlHandlerService.handleDeepLink()` (Universal Link/App Link nativi, oc:7980) e aveva già portato quella groundwork su `develop` (non esisteva lì) più applicato un fix sopra. Testando lo scenario reale (link aperto in un browser, non nell'app nativa installata) è emerso che `handleDeepLink()` **non viene mai invocato** in quel caso — è raggiungibile solo dal listener Capacitor `appUrlOpen`, nativo-only. Il developer ha confermato che l'esperienza reale degli utenti è quella web (pagina, non app nativa installata). **Tutto il lavoro su `handleDeepLink()`/`appUrlOpen` è stato scartato integralmente** (nessuna traccia nel codice finale, working tree ripristinato a `develop` pulito) e il piano è stato riscritto da zero per il percorso web.
- **Base branch cambiata più volte**: partito da `RDO_ass_cammini_italia_2026_2` (dove il codice originale del ticket era osservabile), poi spostato su `develop` su richiesta esplicita del developer ("la modifica DEVE essere fatta sul develop compresi tutti i suoi submodule"). Questo ha reso necessario, nel primo giro (poi scartato), ricreare `handleDeepLink()` da zero su `develop` — complessità rivelatasi inutile una volta scartato quel percorso.
- **Review per-task saltata su richiesta esplicita del developer** ("non fare review mi raccomando") — deviazione dal processo standard di `subagent-driven-development`. Fatti solo controlli di scope leggeri (diff/git status) da parte mia, non una review formale di qualità/spec-compliance.
- **Estensione dell'`include` di test discovery nel repo principale**: `core/tsconfig.spec.json` e `core/angular.json` avevano `include` ristretto a `src/app/services/**` (oc:8023, per tenere fuori gli spec di wm-core/map-core che crashano). Il nuovo `home.page.spec.ts` vive fuori da quel path — aggiunto `src/app/pages/home` come path esplicito separato (non un allargamento del wildcard), approvato dal developer prima di applicarlo.
- **Ambiente Node incompatibile durante l'esecuzione**: la shell di default aveva Node v18.13.0, sotto il minimo richiesto da Angular CLI (v20.19+/v22.12+) — risolto puntando `PATH` alla versione v22.23.2 già installata via nvm, nessuna modifica permanente all'ambiente.

## Bug trovati

Durante l'investigazione (prima di arrivare al fix applicativo corretto) sono emersi due livelli di causa distinti, entrambi diagnosticati e risolti:

### 1. Bug infrastrutturale (Apache, già risolto in produzione via SSH — fuori da qualsiasi repo git)

Due problemi di configurazione sul server che ospita `sentieri.caiparma.it` e l'infrastruttura condivisa `*.mobile.webmapp.it`:
- **`sentieri.caiparma.it`**: la regola di reverse-proxy mobile-UA verso `http://33.mobile.webmapp.it/` era dentro un blocco `<Directory>` con `DirectoryIndex index.html` — `mod_dir` generava una subrequest interna per `index.html` che veniva anch'essa proxata, sovrascrivendo il target della richiesta principale. Fix: proxy spostato fuori da `<Directory>`, a livello vhost.
- **`mobile.webmapp.it.conf`/`-le-ssl.conf`** (infrastruttura condivisa, tutti gli shard): fallback SPA con `[L]` invece di `[END]` in contesto per-directory, causava un "restart" del ciclo di rewrite che corrompeva `%{REQUEST_URI}` usato dal redirect HTTP→HTTPS successivo. Fix: `[L]` → `[END]`.

Diagnosticati con `LogLevel alert rewrite:trace6` temporaneo (rimosso a fine debug) — due ipotesi precedenti basate sulla sola lettura statica della config si erano rivelate insufficienti.

**Audit degli altri vhost con lo stesso pattern**: preparato e passato a un'altra sessione/AI operante sul server (~35 vhost, condivisi + domini custom cliente). **Esito non riportato in questa sessione** — verificare con il developer.

### 2. Bug applicativo (Angular, oggetto del fix in questo ciclo)

Una volta corretta l'infrastruttura, l'app Angular web (la stessa servita a desktop e mobile) riceve correttamente i query param, ma:
- **Race condition in `UrlHandlerService.initialize()`** (wm-core): `_currentQueryParams$.next(params)` era l'ultima istruzione del blocco, eseguita *dopo* i `dispatch()`. Quando il dispatch di `currentEcLayerId` scatenava sincronamente (via effect NgRx) una reazione che chiamava `changeURL('map')` (in `HomePage`), quella chiamata leggeva ancora il valore precedente (vuoto) di `_currentQueryParams$`, perdendo `track`/`layer` dall'URL finale.
- **`HomePage` non reagiva a `track`/`poi`**: la subscription reattiva che naviga automaticamente su `map` esisteva solo per `currentEcLayer`/`ugcOpened`, non per `currentEcTrack`/`currentEcPoi` — un link con solo `track` (come nel repro originale del ticket) non faceva mai navigare l'utente fuori da Home.

## Decisioni

- **`handleDeepLink()`/`appUrlOpen` (oc:7980) fuori scope, integralmente**: esplorato, implementato, poi scartato per intero quando è emerso che non è il percorso di codice rilevante per il problema reale (web, non nativo). Nessuna traccia nel codice finale.
- **Nessuna guardia `onRecord`/`drawOpened` nel `merge()` di `HomePage`**: il meccanismo esistente per `layer`/`ugcOpened` non aveva mai questa guardia — estenderla ora solo per track/poi avrebbe introdotto un'asimmetria non richiesta esplicitamente in questo ciclo.
- **`currentEcTrack`/`currentEcPoi` si risolvono sempre in modo asincrono** (verificato in `ec.service.ts:46`, `getEcTrack()` passa sempre da una `Promise.then()` tranne il caso `id == null` che ritorna `of(null)` sincrono) — l'estensione a track/poi in `HomePage` non introduce lo stesso tipo di race già vista per il layer (sincrono via selettore da config già cache).
- **Fix su `initialize()` mantenuto comunque necessario e generico**: anche se track/poi non hanno lo stesso problema di sincronicità del layer, riordinare `_currentQueryParams$.next(params)` in testa resta la correzione robusta e minimale per qualunque consumer reattivo presente o futuro.

## Review formale (`wm-skills:wm-review-ticket`)

Eseguita sul diff nel working tree (nessuna PR ancora aperta) con 5 finder paralleli. Trovati e risolti 2 blocker:

1. **Test di Task 1 rotto**: `url-handler.service.spec.ts` chiamava `done()` una volta per ciascuno dei 7 `dispatch()` in `initialize()`, causando un errore Jasmine ("called more than once"). Corretto con una guardia booleana — un solo `done()` per test.
2. **`currentEcPoi` non garantiva la navigazione per `?poi=<id>&search=<termine-non-corrispondente>`**: causa radice, fix, e verifica end-to-end descritti in **Task 3** (nuovo, aggiunto al piano dopo la review) — `currentEcPoi` ora cerca per id in `allEcpoiFeatures` invece che nella lista filtrata `ecPois`, simmetrico a `currentEcTrack`. Risolve anche un bug preesistente nel pannello di dettaglio POI sulla mappa (stesso selettore, mai notato prima).

Applicati anche i cleanup non bloccanti: predicato `filter(isNotNull)` condiviso in `HomePage` (invece di 3 lambda duplicate; rinominato da `isSet` a `isNotNull` in una review successiva — non è un controllo relativo a un `Set`), test aggiunti per i branch preesistenti (`layer`, `ugcOpened`) in `home.page.spec.ts`, commento sull'invariante sopra `_currentQueryParams$.next(params)`, `angular.json`/`tsconfig.spec.json` elencati nei Moduli toccati.

### Task 3 (`currentEcPoi` da `ecPois` a `allEcpoiFeatures`) — implementato, poi REVERTATO

Implementato con TDD (test scritto, fallito, fix applicato, passato, suite completa wm-core 159/159 verde) subito dopo la review. Il developer ha poi verificato manualmente uno scenario diverso da quello per cui Task 3 era stato pensato: `http://localhost:4200/?poi=36961` (nessun `search` in conflitto) — il POI viene selezionato sulla mappa ma **il pannello di dettaglio non si apre**. Task 3 non risolve questo sintomo (non era il problema che intendeva risolvere — quello era specifico alla combinazione `poi`+`search` non corrispondente), quindi il developer ha chiesto di revertarlo integralmente.

**Revertato**: `ec.selector.ts` tornato alla versione originale (`currentEcPoi` cerca di nuovo in `ecPois`), `ec.selector.spec.ts` eliminato. Nessuna traccia nel diff finale.

**Causa del sintomo `?poi=<id>` (senza search) → nessun pannello — investigata e risolta come nuovo Task 3.**

### Task 3 (nuovo, corretto): `MapDetailsComponent` non apre il pannello se il feature è già selezionato al mount

**Causa esatta**: `MapDetailsComponent.ngAfterViewInit()` sottoscrive `featureOpened$` (derivato da `currentEcPoi`/`currentEcTrack`) con `skip(1)`. Nel flusso "click su risultato di ricerca" questo è corretto: il componente è già montato, `featureOpened` parte da `false`, e la transizione a `true` dopo il click viene osservata normalmente. Nel flusso "query param iniziale sulla root" (`?poi=<id>`), invece, `UrlHandlerService.initialize()` dispatcha `currentEcPoiId` **mentre l'utente è ancora su Home** — `featureOpened` diventa `true` prima che `MapDetailsComponent` esista. Quando il componente monta (dopo la navigazione a `/map` triggerata da Task 2), il primo valore emesso da `featureOpened$` è già `true`, ma `skip(1)` lo scarta — nessuna transizione successiva arriva mai, `setMapDetailsStatus({status: 'open'})` non viene mai dispatchato, il pannello resta chiuso pur essendo il POI evidenziato sulla mappa (quest'ultimo dipende da `currentEcPoi`/`poiProperties` direttamente, non da `mapDetailsStatus`).

**Verificato con `git log -p`** che il `skip(1)` non ha una motivazione specifica documentata nel commit che lo ha introdotto (refactor generico `ngAfterViewInit`, commit `8c518175`) — non sembra una scelta deliberata per questo scenario, quindi rimuoverlo è sicuro.

**Fix**: rimosso `skip(1)` — se il feature è già aperto al momento del mount, il pannello si apre comunque; le transizioni successive continuano a funzionare come prima (verificato con test dedicato).

**Rischio residuo — precisato in review formale (seconda review)**: se `MapDetailsComponent` venisse distrutto e ricreato mentre un feature è ancora "aperto" nello store dopo che l'utente aveva chiuso manualmente il pannello, il pannello potrebbe riaprirsi da solo al rimontaggio. Verificato che l'attribuzione iniziale a `IonicRouteStrategy` era imprecisa: quella strategy (`shouldDetach()`/`shouldAttach()` sempre `false`, verificato nel sorgente `@ionic/angular`) non cachea nulla — la persistenza dei tab (Home/Map/Profile/Favourites) è garantita da `IonRouterOutlet`/`ion-tabs` (outlet multipli con swap di visibilità), non dalla route-reuse strategy Angular. La conclusione pratica resta valida (i tab non vengono distrutti passando tra loro), ma solo per navigazioni **dentro** l'albero `ion-tabs`. Trovati due punti reali che navigano **fuori** da quell'albero (`map.page.ts` `goToPage()`→`downloadlist`, `profile-data.component.ts`→`downloadlist` via `navigateForward`) — entrambi però droppano incidentalmente i query param `poi`/`track` durante quella navigazione, il che already azzera lo stato prima del rimontaggio nella maggior parte dei casi. Resta una finestra di race stretta (~100ms, il debounce di `initialize()`) in cui il rimontaggio potrebbe avvenire prima che l'azzeramento propaghi. Rischio confermato reale ma circoscritto, non riprodotto empiricamente, accettato come debito noto.

TDD applicato: test scritto (3 casi: già aperto al mount, non aperto, transizione dopo mount) → primo caso fallito come previsto → fix applicato → tutti passano → suite completa repo principale 13/13 SUCCESS.

**Tentativo di cleanup poi corretto**: avevo provato a consolidare l'import di `currentEcLayer` da `user-activity.selector` a `ec.selector` (assumendo fosse ri-esportato) — `ec.selector.ts` lo *importa* internamente ma non lo *esporta*. Corretto tornando all'import originale, verificato con i test.

Suite completa wm-core rieseguita dopo tutte le modifiche: 156/156 SUCCESS (il numero 159 riportato inizialmente era residuo dello stato intermedio con il Task 3 poi revertato — corretto in seconda review formale). Suite completa repo principale: 13/13 SUCCESS.

## Seconda review formale (dopo l'aggiunta del Task 3 su `MapDetailsComponent`)

Nessun blocker. Applicati i cleanup verificati: rinominato `isSet` → `isNotNull` (non è un controllo relativo a un `Set`), corretto il numero di test in questo file (159→156), precisata l'attribuzione del meccanismo di persistenza dei tab (sopra). Confermato via `git diff`/grep che il vecchio Task 3 (`currentEcPoi`/`allEcpoiFeatures`, revertato) non ha lasciato nessun residuo in nessuno dei due repo.

Osservazione architetturale non risolta in questo ciclo (severity cleanup, non bloccante): i 3 fix di questo ticket convergono sullo stesso problema di fondo — nessun punto unico di orchestrazione per "quando un feature (layer/track/poi) diventa corrente via URL, cosa deve succedere, in che ordine, e come si spegne alla chiusura manuale". Il TODO già presente in `home.page.ts` ("creare uno store della app e gestire questo caso come effect del repo app") è più giustificato ora — 3 bug della stessa famiglia in un solo ciclo, di cui uno scoperto solo dopo un giro di test manuale. Non affrontato in questo ticket, candidato per un refactoring futuro.

## Follow-up

- [ ] **Verifica manuale end-to-end su device/browser reale** (non eseguita in questa sessione, solo test unitari + verifica di codice):
  - `http://localhost:4200/?track=<id>&search=<termine>` → deve navigare su `/map` con dettaglio traccia visibile, URL finale con `track`/`search` intatti.
  - `?poi=<id>` → stesso comportamento per POI.
  - `?track=<id>&layer=<id-layer>` → verificare che l'URL finale su `/map` conservi entrambi i param (verifica diretta del fix sulla race condition).
  - Link con solo `search` → deve restare su Home (nessuna regressione).
  - Ripetere lo scenario originale del ticket (`https://sentieri.caiparma.it/?track=89812&search=borello`) da smartphone reale, ora che sia il bug infra che quello applicativo sono corretti.
- [ ] **Esito dell'audit vhost Apache** — da recuperare dalla sessione/AI che lo ha eseguito sul server.
- [ ] **Review formale non eseguita** (per-task né whole-branch) — considerare prima del merge, dato che è stata esplicitamente saltata su richiesta durante l'esecuzione.
- [ ] Commit e PR non ancora fatti: tutte le modifiche sono nel working tree (no commit per policy Webmapp) di entrambi i repo, in attesa di approvazione esplicita del developer.
- [ ] Verificare se oc:7980 (scan QR code, `handleDeepLink()`) ha un proprio branch/PR pendente altrove — non controllato in questa sessione, dato che il relativo lavoro è stato scartato prima di arrivare a quel punto.
