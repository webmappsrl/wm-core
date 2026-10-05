# Varianti per shard: `fileReplacements` e classi base

## Come funziona oggi

Una variante di shard è un file `.ts` **gemello** del componente di default, instradato dai `fileReplacements` dichiarati nell'`angular.json` del consumer che fa il build. Il vincolo di schema Angular riguarda solo il `.ts`: la variante può puntare allo stesso `templateUrl` del default quando la struttura DOM non cambia, e avere `styleUrls` propri. Gli `styleUrls` di componenti diversi possono condividere liberamente partial SCSS — `home-layer-shared.scss` esiste per questo.

Quattro varianti `.camminiditalia` oggi, tutte con una classe base condivisa e un template proprio: `wm-home-layer` (oc:8391, `WmHomeLayerBaseComponent`), `wm-searchbar` (oc:8414, `SearchBarBaseComponent`), `wm-layer-box` e `wm-search-box` (oc:8701, `LayerBoxBaseComponent`, `SearchBoxBaseComponent`). I template di `wm-home-layer`, `wm-layer-box` e `wm-search-box` sono copie di quelli di default più lo stato del passaporto (oc:8166, oc:8701): le correzioni al template di default vanno riportate anche lì, e nessuno strumento lo segnala. Per `wm-layer-box` e `wm-search-box` copia e template di default hanno in testa un commento che rimanda all'altro file.

Le basi di `wm-layer-box` e `wm-search-box` sono `@Directive()` astratte, non `@Injectable()`: estendono `BaseBoxComponent`, che è già una `@Directive`, e `wm-layer-box` dichiara degli `@Input`.

## Quando estrarre una base, e quando no

La policy generale del repo principale è **non** estrarre una classe base: è stata scartata due volte, su `home.component.ts` e `profile.page.ts`. Le estrazioni esistenti sono deviazioni motivate, non un'abrogazione della regola:

- **`WmHomeLayerBaseComponent`** (oc:8391): la logica TS delle due varianti è identica al 100%, cambiano solo template e stile. Trattata come validazione del pattern per quel ciclo, non promossa a policy.
- **`SearchBarBaseComponent`** (oc:8414): non è l'intero componente identico con stile diverso, è un sottoinsieme di logica genuinamente condiviso al 100% (form di ricerca, debounce, dispatch `inputTyped`), e la sottoclasse camminiditalia **aggiunge** funzionalità invece di duplicarla con modifiche.
- **`LayerBoxBaseComponent`, `SearchBoxBaseComponent`** (oc:8701): stesso criterio. La logica del componente di default (preferiti, click, evento PostHog; le icone) è passata intera nella base, e la variante aggiunge solo lo stato del passaporto (`ring$`, `chip$`).

Il criterio che distingue i casi accettati da quelli scartati è questo, non la comodità.

**Un componente interamente nuovo non ha una variante generica.** Il piano originale di oc:8414 prevedeva un `HomeRouteFiltersComponent` generico gated sui dati, montato accanto alla searchbar. Il developer ha fatto notare che, a differenza di `wm-home-layer` — preesistente e usato da tutti gli shard — `home-route-filters` non era mai esistito: mantenerne una versione generica per shard che non l'hanno chiesta non aveva senso. Il pannello è diventato parte della variante della searchbar, e `home.component.html`/`.ts` sono tornati identici a prima del ticket. Per lo stesso motivo `home-route-filter-row` ha un'unica implementazione.

## Trappole

Vivono in [.claude/rules/varianti-e-classi-base.md](../../.claude/rules/varianti-e-classi-base.md),
dove si caricano toccando un file gemello o una classe base: il decorator obbligatorio sulla base
(`@Injectable()` o `@Directive()`) e l'errore `NG0202` che compare solo a runtime, il template da non duplicare, e lo split di uno SCSS
che può lasciare senza stile tutti gli shard tranne quello della variante. Qui resta il perché.


## Come ci siamo arrivati

- **Varianti complete senza base per `wm-layer-box` e `wm-search-box`** (oc:8701, superata nello
  stesso ciclo): il piano copiava per intero il `.ts` di default nella variante, applicando la
  regola dell'app. In review il dev ha preferito allinearsi a `wm-home-layer` e `wm-searchbar`:
  con la copia una correzione ai preferiti andava fatta due volte.

## Dettagli di interazione

Le scelte visive della variante camminiditalia (icone, indicatore dei filtri attivi, resa del pannello) sono customizzazione di quel prodotto: stanno nel cantiere di oc:8414, non qui.

- **Animazione del pannello filtri**: trucco CSS `grid-template-rows: 0fr → 1fr`, lo stesso di `wm-config-detail` (oc:8181), senza introdurre `@angular/animations`. Le singole righe filtro non sono animate — follow-up noto.
- **Filtri attivi senza testo digitato** attivano comunque la vista a tab di `wm-home-result`, forzata sulla sola tab Layers — richiesta emersa dopo una demo, non nel piano.
