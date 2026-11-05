# Home: tab dei risultati, conteggi, etichette e stato vuoto

## Come funziona oggi

`wm-home-result` mostra i risultati su tab. `HomeResultTab` (in wm-types) include `'layers' | null`, dove `null` significa "nessuna scelta dell'utente" ed è diverso da un click esplicito su tracks. `homeResultTabSelected` torna a `null` ad ogni `inputTyped`, così il default può riapplicarsi dopo ogni digitazione.

**La scelta del tab la decide una funzione pura**, `homeResultTab` (`home/home-result/home-result-tab.ts`), che restituisce il tab e se i pulsanti Tracks e POI sono visibili. Ordine: con filtri Home attivi e nessun layer aperto, `'layers'` o `null`; poi il tab cliccato dall'utente, se il suo pulsante è visibile; poi `'layers'` se ci sono layer disponibili e nessun layer aperto; poi `'tracks'` → `'pois'` → `null`. **Tracks vale solo se il suo pulsante è visibile** (`showTracks`): con soli filtri POI, senza layer né UGC aperti, la home apre i POI. Il template legge `tracksTabVisible$` e `poisTabVisible$` invece di ricalcolare i pulsanti, e mostra la barra dei tab solo se c'è un tab (`null` vuol dire nessun pulsante visibile) e nessun messaggio vuoto.

**Il badge di conteggio dei layer non cambia con la ricerca**: `layerFeaturesTotalCount` legge `initialAggregationBucketsLayers`, prese una volta da `initLayerAggregations$` (che scatta su `loadConfSuccess` e chiama `ecSvc.getQuery({})` senza parametri). `layerFeaturesCount` usa invece le aggregazioni filtrate correnti, e serve ovunque tranne che in quel badge. L'azione dedicata `ecTracksInitAggregationsSuccess` aggiorna **solo** `initialAggregations`, per non sporcare i risultati di ricerca correnti.

**Badge e segment usano le stesse chiavi i18n**: `'Sentiero'/'Sentieri'` e `'Punto di interesse'/'Punti di interesse'`. Il valore di default di quest'ultima è "POI" in tutte le lingue.

**Lo stato vuoto lo decide una funzione pura**, `homeResultEmptyState` (`home/home-result/home-result-empty-state.ts`), con due messaggi: uno per i filtri Home senza cammini e uno generico. Quello sui filtri ha la precedenza. Con soli filtri POI le tracce non contano: il generico compare se non ci sono né POI né cammini, ma solo a caricamento dei POI finito (`ecPoisLoaded`, vero sia con `loadEcPoisSuccess` sia con `loadEcPoisFailure`). Con un messaggio la barra dei tab è nascosta. Il contenitore `role="status"` è sempre nel DOM; cambia solo il contenuto.

## Perché così

- **Il conteggio totale non deve seguire la query** (oc:7643): un badge che cambia mentre si digita non dice più quanti elementi contiene il layer.
- **La causa delle etichette disallineate era strutturale, non terminologica** (oc:8221): badge e segment usavano due coppie di chiavi indipendenti per lo stesso concetto (`'Percorso'/'Percorsi'`+`'Luogo'/'Luoghi'` contro `'Sentieri'`+`'Punti di interesse'`). Correggere il testo da una parte sola avrebbe lasciato l'altra disallineata per sempre: il badge è stato migrato sulle chiavi del segment.
- **"POI" come default è un cambio globale, non solo per Forestas** (oc:8221): motivo di spazio in UI. Un'istanza che preferisca il testo esteso fa override via `config.json` → `ICONF.TRANSLATIONS`, senza toccare wm-core — lo stesso pattern già usato per la chiave `'layers'`.
- **Un override di produzione sopravvive al cambio del default** (oc:8221), verificato nell'ordine di merge di `LangService._init()`: default hardcoded → `APP_TRANSLATION` (build-time, per istanza) → `conf.TRANSLATIONS` da `config.json` (runtime, applicato per ultimo con `setTranslation(lang, translations[lang], true)`).
- **La chiave `'layers'` ha "Layers" come default** (oc:7643) e il backend fa override via `wmlang` per ogni app: "Cammini", "Percorsi", "Itinerari".
- **Con i filtri Home attivi il pannello restava bianco** (oc:8765): `showResultTabSelected$` restituisce `null` se nessun cammino corrisponde, e il vecchio messaggio guardava `countAll`, cioè tracce e POI, che i filtri Home non toccano. Il messaggio sui filtri dipende solo dalla configurazione, quindi non aspetta il caricamento delle tracce; il generico sì, per non comparire durante il caricamento.
- **Testo del sito del cliente, nessun bottone** (oc:8765): «Spiacenti, non ci sono cammini inerenti alla ricerca». La parola «cammini» è sicura perché `routeFilters` lo scrive solo la searchbar di camminiditalia.
- **Regione live sempre presente** (oc:8765): una `role="status"` creata già piena con `*ngIf` spesso non viene annunciata dagli screen reader; cambia solo il contenuto.
- **Illustrazione della lente sulla mappa** (oc:8765): parla di ricerca, quindi vale anche per il messaggio generico su ogni shard, non solo per i cammini.
- **Il tab segue la stessa regola che mostra i pulsanti** (oc:8933): con soli filtri POI il pulsante Tracks era nascosto da `showTracks`, ma il tab calcolato restava `'tracks'` e sotto il solo pulsante «POI» comparivano i sentieri (CAI Parma, «cartelli di segnaletica»). Legare il tab a `showTracks` copre in un punto solo filtro dalla mappa, card `poi_type_filter` della home, `?filter=` e ricerca testuale con filtro attivo, e togliendo il filtro il tab torna sulle track da solo.
- **Una funzione pura che restituisce anche la visibilità del pulsante** (oc:8933): il bug è nato dal disaccordo fra calcolo del tab e `*ngIf` del template; con un valore solo, letto da entrambi, non possono più divergere.
- **Il messaggio vuoto con filtro POI aspetta i POI** (oc:8933): i POI arrivano in modo asincrono, e senza `ecPoisLoaded` un link con `?filter=` mostrava «nessun risultato» prima della lista.
- **Filtri misti track + POI e layer aperto restano su Tracks** (oc:8933): i due pulsanti sono visibili, quindi non c'è un tab nascosto ma selezionato; far prevalere il filtro POI sarebbe una scelta di prodotto.

## Come ci siamo arrivati

- **`lastFilterType` preferiva i POI dopo un filtro POI** (oc:5634, superata): il refactor che ha unificato lo stato dei tab l'ha tolta, lasciando `lastFilterType$` nel `combineLatest` senza che nessuna riga lo usasse. Non è stata ripristinata in oc:8933 perché la mappa invia `setLastFilterType` ma la card della home e `?filter=` no: avrebbe dato comportamenti diversi a seconda di dove si filtra.
- **Impostare il tab nel reducer di `setLastFilterType`** (oc:8933, scartata): decisa nello scrum del 05/11, poi sostituita perché non copriva la ricerca testuale (`inputTyped` riporta il tab a `null`) e lasciava il tab su POI dopo aver tolto il filtro.
- **Regola dei filtri Home ripetuta in tre punti** (oc:8765, superata da oc:8933): era il debito di `homeResultEmptyState`, `showResultTabSelected$` e `*ngIf` dei tab; ora tab e pulsanti Tracks e POI vengono da `homeResultTab`.

## Trappole verificate

- **`normalizeString()` è una funzione pura a livello di modulo**, non un metodo di classe (oc:7643): gli initializer delle property non possono chiamare metodi di istanza. Per lo stesso motivo `filteredLayers$`, `countLayers$` e `showResultTabSelected$` si inizializzano nel costruttore.
- **`ecLayer` va aggiunto al `combineLatest` con `.pipe(startWith(null))`** (oc:7643): senza, la prima emissione resta bloccata finché `ecLayer` non emette.
- **`homeResultTab$` va condiviso con `shareReplay`** (oc:8933): è letto da tre `async`, e `countLayers$` ha un `debounceTime(300)` per sottoscrizione; senza condivisione il pulsante Tracks compariva 300 ms dopo la barra.
- **`EcService.getPois()` può completare senza emettere** (oc:8933): con una risposta 200 senza body e nessuna copia in IndexedDB. L'effect `loadEcPois$` usa `defaultIfEmpty(loadEcPoisFailure())`, altrimenti `ecPoisLoaded` resterebbe false per sempre. Una 304 invece non passa da lì: per `HttpClient` è un errore (ok solo con status 200–299), e senza cache arriva al `catchError` dell'effect; il ramo `status === 304` di `getPois()` non si raggiunge mai.
- **`LangService.instant(layer.title as any)`** risolve sia stringhe sia oggetti `{it: '…', en: '…'}` (oc:7643): i titoli dei layer che arrivano dalla conf sono oggetti i18n, non stringhe.
- **`layer-box` ha `@Input() showBadge = true` e `@Input() useTotal = false`** (oc:7643): il secondo fa usare al badge il conteggio non filtrato.
- **Le variabili CSS dello stato vuoto devono esistere in entrambi i prodotti** (oc:8765): vedi la rule `css-per-istanza`.

## Debito noto

- **Le chiavi orfane `Percorso`/`Percorsi`/`Luogo`/`Luoghi` sono state lasciate apposta** (oc:8221): nessun componente le referenzia più, ma rimuoverle potrebbe rompere in silenzio un override di produzione non ispezionabile da questo repo. Da riconsiderare solo dopo un audit dei `config.json` di produzione.
- **`lastFilterType` è stato morto nello store** (oc:8933): azione, reducer, selettore, `lastFilterTypeEvt` di `filters.component` e `slider-filter` e l'invio da `geobox-map` restano, ma nessuno lo legge più. Da togliere in un ticket di pulizia.
- **Con un filtro POI attivo il messaggio vuoto può comparire per un istante mentre si digita** (oc:8933), prima che il debounce di `countLayers$` porti al tab layers: lo stesso succede già con i filtri Home.
- **Nessun test di regressione sull'allineamento badge/segment** (oc:8221): i test Karma dei componenti sono esclusi dalla CI per crash pregressi (`NG0201` su `APP_TRANSLATION` mancante in DI, oc:8023), e un test Cypress avrebbe richiesto nuove fixture — sproporzionato per un bugfix. Rischio di recidiva accettato.
