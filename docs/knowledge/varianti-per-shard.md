# Varianti per shard: `fileReplacements` e classi base

## Come funziona oggi

Una variante di shard è un file `.ts` **gemello** del componente di default, instradato dai `fileReplacements` dichiarati nell'`angular.json` del consumer che fa il build. Il vincolo di schema Angular riguarda solo il `.ts`: la variante può puntare allo stesso `templateUrl` del default quando la struttura DOM non cambia, e avere `styleUrls` propri. Gli `styleUrls` di componenti diversi possono condividere liberamente partial SCSS — `home-layer-shared.scss` esiste per questo.

Due varianti `.camminiditalia` oggi: `wm-home-layer` (oc:8391) e `wm-searchbar` (oc:8414), entrambe con una classe base condivisa (`WmHomeLayerBaseComponent`, `SearchBarBaseComponent`).

## Quando estrarre una base, e quando no

La policy generale del repo principale è **non** estrarre una classe base: è stata scartata due volte, su `home.component.ts` e `profile.page.ts`. Le due estrazioni esistenti sono deviazioni motivate, non un'abrogazione della regola:

- **`WmHomeLayerBaseComponent`** (oc:8391): la logica TS delle due varianti è identica al 100%, cambiano solo template e stile. Trattata come validazione del pattern per quel ciclo, non promossa a policy.
- **`SearchBarBaseComponent`** (oc:8414): non è l'intero componente identico con stile diverso, è un sottoinsieme di logica genuinamente condiviso al 100% (form di ricerca, debounce, dispatch `inputTyped`), e la sottoclasse camminiditalia **aggiunge** funzionalità invece di duplicarla con modifiche.

Il criterio che distingue i casi accettati da quelli scartati è questo, non la comodità.

**Un componente interamente nuovo non ha una variante generica.** Il piano originale di oc:8414 prevedeva un `HomeRouteFiltersComponent` generico gated sui dati, montato accanto alla searchbar. Il developer ha fatto notare che, a differenza di `wm-home-layer` — preesistente e usato da tutti gli shard — `home-route-filters` non era mai esistito: mantenerne una versione generica per shard che non l'hanno chiesta non aveva senso. Il pannello è diventato parte della variante della searchbar, e `home.component.html`/`.ts` sono tornati identici a prima del ticket. Per lo stesso motivo `home-route-filter-row` ha un'unica implementazione.

## Trappole verificate

- **`@Injectable()` è obbligatorio su ogni classe base plain estesa da un `@Component` con parametri costruttore** (oc:8391). Senza il decorator, il compilatore Angular non genera la factory DI (`ɵfac`) da cui le sottoclassi ereditano i tipi dei parametri. L'errore `NG0202` compare **solo a runtime reale**: uno spec che istanzia il componente con `new` bypassa la DI di Angular e non lo vede. Scoperto provando l'app nel browser. C'è una guardia di regressione in `home-layer-base.component.spec.ts` che verifica che `ɵfac` sia definito.
- **Lo split di uno SCSS fra base e variante può far sparire lo stile del default** (oc:8391): le regole di overlay `.wm-box-title` e `wm-img.wm-home-layer-logo-overlay` erano finite solo nel design `.camminiditalia`, pur essendo generiche fin da oc:8164/oc:8176. Risultato: tutti gli altri shard perdevano completamente lo stile — titolo come testo semplice sotto la foto, logo non dimensionato. Quando si splitta uno SCSS, verificare che nel file di default resti tutto ciò che era comune prima.
- **Enum fisso al posto della derivazione dai dati, solo dove il vocabolario è chiuso** (oc:8414): Stagioni e Portata sono l'unica eccezione esplicita al requisito "mai opzioni hardcoded, sempre derivate dalla config" — richiesta del developer, e i valori coincidono con gli enum PHP `Season`/`OsmWalkingNetwork`, verificato. Gli altri 5 filtri restano dinamici via `Map<string, FilterOption>`, che serve perché occorre accumulare count e label per chiave, non solo deduplicare.
- **Un filtro della Home non raggiunge la mappa da solo** (oc:8414): `routeFilters` era letto solo da `filteredLayers$`/`confHOMEFiltered`, mentre OpenLayers in `map-core` usa un sistema di filtro distinto e preesistente (`mapFilters`/`filterTracks`). È servito un selettore `routeFilteredLayerIds` incluso in `mapFilters` e consumato da `styleFn`.
- **Con un layer già aperto i filtri della Home non sono più pertinenti** (oc:8414): `showResultTabSelected$` forzava il tab in base a `hasActiveRouteFilters` anche in quel caso, e le tappe del layer sparivano da mappa, lista e persino dal tab "Tappe". Serve la condizione `&& !currentLayer`, con l'analogo aggiustamento nei bottoni tab e in `styleFn`.
- **`confMAPLayers` non era null-safe** (oc:8414): `state.layers` invece di `state?.layers`. Non era mai emerso perché nessun consumer lo sottoscriveva prima del caricamento della config; la prima sottoscrizione diretta ha esposto il bug, e l'eccezione alla prima emissione disattivava l'observable per sempre.

## Dettagli di interazione

Le scelte visive della variante camminiditalia (icone, indicatore dei filtri attivi, resa del pannello) sono customizzazione di quel prodotto: stanno nel cantiere di oc:8414, non qui.

- **Animazione del pannello filtri**: trucco CSS `grid-template-rows: 0fr → 1fr`, lo stesso di `wm-config-detail` (oc:8181), senza introdurre `@angular/animations`. Le singole righe filtro non sono animate — follow-up noto.
- **Filtri attivi senza testo digitato** attivano comunque la vista a tab di `wm-home-result`, forzata sulla sola tab Layers — richiesta emersa dopo una demo, non nel piano.
