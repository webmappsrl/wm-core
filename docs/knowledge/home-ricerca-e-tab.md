# Home: tab dei risultati, conteggi ed etichette

## Come funziona oggi

`wm-home-result` mostra i risultati su tab. `HomeResultTab` (in wm-types) include `'layers' | null`, dove `null` significa "nessuna scelta dell'utente" ed è diverso da un click esplicito su tracks. `homeResultTabSelected` torna a `null` ad ogni `inputTyped`, così il default può riapplicarsi dopo ogni digitazione.

La scelta del tab da mostrare (`showResultTabSelected$`) segue quest'ordine: il tab cliccato dall'utente se valido; altrimenti `'layers'` se ci sono layer disponibili e nessun layer aperto; altrimenti `'tracks'` → `'pois'` → `null`.

**Il badge di conteggio dei layer non cambia con la ricerca**: `layerFeaturesTotalCount` legge `initialAggregationBucketsLayers`, prese una volta da `initLayerAggregations$` (che scatta su `loadConfSuccess` e chiama `ecSvc.getQuery({})` senza parametri). `layerFeaturesCount` usa invece le aggregazioni filtrate correnti, e serve ovunque tranne che in quel badge. L'azione dedicata `ecTracksInitAggregationsSuccess` aggiorna **solo** `initialAggregations`, per non sporcare i risultati di ricerca correnti.

**Badge e segment usano le stesse chiavi i18n**: `'Sentiero'/'Sentieri'` e `'Punto di interesse'/'Punti di interesse'`. Il valore di default di quest'ultima è "POI" in tutte le lingue.

## Perché così

- **Il conteggio totale non deve seguire la query** (oc:7643): un badge che cambia mentre si digita non dice più quanti elementi contiene il layer.
- **La causa delle etichette disallineate era strutturale, non terminologica** (oc:8221): badge e segment usavano due coppie di chiavi indipendenti per lo stesso concetto (`'Percorso'/'Percorsi'`+`'Luogo'/'Luoghi'` contro `'Sentieri'`+`'Punti di interesse'`). Correggere il testo da una parte sola avrebbe lasciato l'altra disallineata per sempre: il badge è stato migrato sulle chiavi del segment.
- **"POI" come default è un cambio globale, non solo per Forestas** (oc:8221): motivo di spazio in UI. Un'istanza che preferisca il testo esteso fa override via `config.json` → `ICONF.TRANSLATIONS`, senza toccare wm-core — lo stesso pattern già usato per la chiave `'layers'`.
- **Un override di produzione sopravvive al cambio del default** (oc:8221), verificato nell'ordine di merge di `LangService._init()`: default hardcoded → `APP_TRANSLATION` (build-time, per istanza) → `conf.TRANSLATIONS` da `config.json` (runtime, applicato per ultimo con `setTranslation(lang, translations[lang], true)`).
- **La chiave `'layers'` ha "Layers" come default** (oc:7643) e il backend fa override via `wmlang` per ogni app: "Cammini", "Percorsi", "Itinerari".

## Trappole verificate

- **`normalizeString()` è una funzione pura a livello di modulo**, non un metodo di classe (oc:7643): gli initializer delle property non possono chiamare metodi di istanza. Per lo stesso motivo `filteredLayers$`, `countLayers$` e `showResultTabSelected$` si inizializzano nel costruttore.
- **`ecLayer` va aggiunto al `combineLatest` con `.pipe(startWith(null))`** (oc:7643): senza, la prima emissione resta bloccata finché `ecLayer` non emette.
- **`LangService.instant(layer.title as any)`** risolve sia stringhe sia oggetti `{it: '…', en: '…'}` (oc:7643): i titoli dei layer che arrivano dalla conf sono oggetti i18n, non stringhe.
- **`layer-box` ha `@Input() showBadge = true` e `@Input() useTotal = false`** (oc:7643): il secondo fa usare al badge il conteggio non filtrato.

## Debito noto

- **Le chiavi orfane `Percorso`/`Percorsi`/`Luogo`/`Luoghi` sono state lasciate apposta** (oc:8221): nessun componente le referenzia più, ma rimuoverle potrebbe rompere in silenzio un override di produzione non ispezionabile da questo repo. Da riconsiderare solo dopo un audit dei `config.json` di produzione.
- **Nessun test di regressione sull'allineamento badge/segment** (oc:8221): i test Karma dei componenti sono esclusi dalla CI per crash pregressi (`NG0201` su `APP_TRANSLATION` mancante in DI, oc:8023), e un test Cypress avrebbe richiesto nuove fixture — sproporzionato per un bugfix. Rischio di recidiva accettato.
