> Ticket: oc:8933

# Notes — sito - errore su filtro cartelli di segnaletica

## Divergenze dal piano, task per task

Tutte nate dalla review finale; il dettaglio dei problemi è in «Bug trovati».

### Task 1: funzione pura homeResultTab

Dalla review interna, `HomeResultTabResult` restituisce anche `poisTabVisible`
(`countPois > 0` e filtri Home non prevalenti): il template non ripete più la regola dei filtri
Home sul pulsante POI. Lo spec confronta solo `tab` e `tracksTabVisible` nei casi esistenti e ha
un blocco nuovo per `poisTabVisible`.

### Task 2: indicatore ecPoisLoaded

Oltre a reducer e selettore, è cambiato l'effect `loadEcPois$` (`ec.effects.ts`): con
`defaultIfEmpty(loadEcPoisFailure())` il caricamento risulta finito anche quando `getPois()`
completa senza emettere. Due test nuovi in `ec.effects.spec.ts`.

### Task 3: stato vuoto con filtro POI senza POI

La regola non è più «`!showTracks && poisLoaded && …` → generic» seguita dalle altre: con
`showTracks` false decide solo il ramo dei POI (generic a caricamento finito, altrimenti null),
così `countAll` e `tracksLoading` non possono dare un messaggio falso. Un caso in più nello spec.

### Task 4: collegare componente e template

- La barra dei tab si mostra con `(showResultTabSelected$|async) && !(emptyState$|async)` invece
  di `((countAll$|async)>0 || (countLayers$|async)>0) && !(emptyState$|async)`.
- `homeResultTab$` è condiviso con `shareReplay({bufferSize: 1, refCount: true})`.
- Dalla review interna: anche il pulsante POI legge `poisTabVisible$` da `homeResultTab`, invece
  di ripetere nel template la regola dei filtri Home (`hasActiveRouteFilters`/`currentLayer`).
  Quattro test in più in `home-result-tab.spec.ts`.

## Bug trovati

- Nella prima versione del fix il messaggio vuoto sarebbe comparso sopra una barra dei tab senza
  pulsanti, e anche mentre i POI stavano ancora arrivando. Li ha trovati la challenge, prima di
  scrivere il codice: vedi «Rischi» in [overview.md](overview.md).
- Dalla review finale, corretti con un test che falliva prima del fix:
  - **Barra dei tab senza pulsanti mentre i POI caricano**: la barra ora si mostra solo se c'è un
    tab da mostrare (`showResultTabSelected$` non null) e nessun messaggio vuoto. Un tab null
    equivale a nessun pulsante visibile.
  - **`ecPoisLoaded` bloccato a false** se `getPois()` completa senza emettere (risposta 200
    senza body e nessuna copia in cache): l'effect `loadEcPois$` invia `loadEcPoisFailure` con
    `defaultIfEmpty`. Test `EcEffects - loadEcPois$ (oc:8933)`. La review lo aveva attribuito a
    una 304 senza cache, ma la review interna ha verificato che per `HttpClient` una 304 è un
    errore (ok solo con status 200–299) e arriva al `catchError` già presente: il fix resta come
    difesa, la motivazione è stata corretta.
  - **Messaggio vuoto falso con soli filtri POI, 0 tracce e POI non caricati**: con `showTracks`
    false decide solo il ramo dei POI. Test «POI non ancora caricati e nessuna traccia».
  - **Pulsante Tracks in ritardo di 300 ms sulla barra**: `homeResultTab$` era sottoscritto tre
    volte, ognuna col debounce di `countLayers$`; ora è condiviso con `shareReplay`.

## Decisioni

- Tag Orchestrator associato: `wm-core` (id 627). Gli altri candidati (`wm-webapp`, `WEBAPP`, …)
  e i tag di contenuto `filtri` e `home` (che non esistevano) sono stati scartati dal dev.
- Approccio: il tab rispetta `showTracks` (opzione B), non il tab impostato nel reducer deciso
  nello scrum del 05/11, perché copre in un solo punto mappa, card della home, `?filter=` e ricerca
  testuale, e quando il filtro si toglie il tab torna sulle track da solo.
- Il primo tentativo, fatto senza `wm-plan`, è rimasto in uno stash di `wm-core` e non è stato
  applicato.

## Prove nel browser (05/11, localhost, CAI Parma — geohub app 33)

| # | Caso | Risultato |
|---|---|---|
| 1 | Filtri della mappa → «Guidepost» (cartelli) | Solo il pulsante «Points of interest 1941», segment `pois`, lista dei cartelli |
| 2 | Filtro attivo + ricerca «anello» | Solo POI (3) |
| 3 | Filtro attivo + ricerca «Lagdei» (7 sentieri, 8 cartelli) | Solo POI (8) |
| 4 | Filtri misti MTB + Guidepost | Entrambi i pulsanti, default Trails 89 |
| 5 | Rimozione del filtro e «Reset filters» | Si torna alla home iniziale |
| — | Senza filtro, ricerca «Lagdei» | Trails 7 + POI 11, default Tracks (invariato) |

Non provati nel browser: filtro attivo con una ricerca che trova solo sentieri e 0 cartelli (non
trovata una parola adatta; coperto dallo spec di `homeResultEmptyState`) e la card
`poi_type_filter` della home (CAI Parma non la ha; stesso percorso di codice del filtro dalla
mappa, coperto dallo spec di `homeResultTab`).

Ricontrollo dopo i fix della review, in italiano: filtro «Cartello di segnaletica» + ricerca
«Lagdei» → solo «POI 8», segment `pois`; senza filtro «Sentieri 7» + «POI 11», default Sentieri.

## Follow-up

- Con un filtro POI attivo, mentre si digita un testo che trova cammini ma nessun POI, il
  messaggio vuoto può comparire per un istante prima che arrivi il tab layers (debounce di
  `countLayers$`). Lo stesso succede già con i filtri Home (oc:8765); rimandato.

- **Note dev del ticket:** a chiusura, la tabella «Prove nel browser» qui sopra va riportata nelle
  note di sviluppo di oc:8933 su Orchestrator (richiesta del dev).
- Rimuovere `lastFilterType` dallo store (azione, reducer, selettore, `lastFilterTypeEvt` di
  `filters.component` e `slider-filter`, invio da `geobox-map`): nessuno lo legge più.
- `wm-webapp`: al bump di `wm-core` a una versione con il diario (oc:8169, da `93f508a`) vanno
  aggiunti a `package.json` `@tiptap/core`, `@tiptap/extensions`, `@tiptap/pm`,
  `@tiptap/starter-kit` (3.32.0, come in `webmapp-app`), e il puntatore di `wm-types` va portato
  almeno a `cc301d2` (passaporto). In locale sono stati installati con `--no-save` solo per provare.
- Nella suite di `wm-core` 37 test falliscono già su `develop` (`DiaryService` oc:8169 e
  `WmHomeLayerComponent (camminiditalia)`), indipendenti da questo lavoro.
