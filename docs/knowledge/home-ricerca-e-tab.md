# Home: tab dei risultati, conteggi, etichette e stato vuoto

## Come funziona oggi

`wm-home-result` mostra i risultati su tab. `HomeResultTab` (in wm-types) include `'layers' | null`, dove `null` significa "nessuna scelta dell'utente" ed è diverso da un click esplicito su tracks. `homeResultTabSelected` torna a `null` ad ogni `inputTyped`, così il default può riapplicarsi dopo ogni digitazione.

La scelta del tab da mostrare (`showResultTabSelected$`) segue quest'ordine: il tab cliccato dall'utente se valido; altrimenti `'layers'` se ci sono layer disponibili e nessun layer aperto; altrimenti `'tracks'` → `'pois'` → `null`.

**Il badge di conteggio dei layer non cambia con la ricerca**: `layerFeaturesTotalCount` legge `initialAggregationBucketsLayers`, prese una volta da `initLayerAggregations$` (che scatta su `loadConfSuccess` e chiama `ecSvc.getQuery({})` senza parametri). `layerFeaturesCount` usa invece le aggregazioni filtrate correnti, e serve ovunque tranne che in quel badge. L'azione dedicata `ecTracksInitAggregationsSuccess` aggiorna **solo** `initialAggregations`, per non sporcare i risultati di ricerca correnti.

**Badge e segment usano le stesse chiavi i18n**: `'Sentiero'/'Sentieri'` e `'Punto di interesse'/'Punti di interesse'`. Il valore di default di quest'ultima è "POI" in tutte le lingue.

**Lo stato vuoto lo decide una funzione pura**, `homeResultEmptyState` (`home/home-result/home-result-empty-state.ts`), con due messaggi: uno per i filtri Home senza cammini e uno generico. Quello sui filtri ha la precedenza e nasconde la barra dei tab. Il contenitore `role="status"` è sempre nel DOM; cambia solo il contenuto.

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

## Trappole verificate

- **`normalizeString()` è una funzione pura a livello di modulo**, non un metodo di classe (oc:7643): gli initializer delle property non possono chiamare metodi di istanza. Per lo stesso motivo `filteredLayers$`, `countLayers$` e `showResultTabSelected$` si inizializzano nel costruttore.
- **`ecLayer` va aggiunto al `combineLatest` con `.pipe(startWith(null))`** (oc:7643): senza, la prima emissione resta bloccata finché `ecLayer` non emette.
- **`LangService.instant(layer.title as any)`** risolve sia stringhe sia oggetti `{it: '…', en: '…'}` (oc:7643): i titoli dei layer che arrivano dalla conf sono oggetti i18n, non stringhe.
- **`layer-box` ha `@Input() showBadge = true` e `@Input() useTotal = false`** (oc:7643): il secondo fa usare al badge il conteggio non filtrato.
- **Le variabili CSS dello stato vuoto devono esistere in entrambi i prodotti** (oc:8765): vedi la rule `css-per-istanza`.

## Debito noto

- **Le chiavi orfane `Percorso`/`Percorsi`/`Luogo`/`Luoghi` sono state lasciate apposta** (oc:8221): nessun componente le referenzia più, ma rimuoverle potrebbe rompere in silenzio un override di produzione non ispezionabile da questo repo. Da riconsiderare solo dopo un audit dei `config.json` di produzione.
- **La regola «filtri Home attivi senza layer aperto» è in tre punti** (oc:8765): `homeResultEmptyState`, `showResultTabSelected$` e gli `*ngIf` dei tab. Andrebbe unificata in una funzione che restituisca anche tab e visibilità della barra.
- **Nessun test di regressione sull'allineamento badge/segment** (oc:8221): i test Karma dei componenti sono esclusi dalla CI per crash pregressi (`NG0201` su `APP_TRANSLATION` mancante in DI, oc:8023), e un test Cypress avrebbe richiesto nuove fixture — sproporzionato per un bugfix. Rischio di recidiva accettato.
