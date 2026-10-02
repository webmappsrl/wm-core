> Ticket: oc:8684

# Notes — POI non visibili nella sezione "Filtri" dell'app

## Divergenze dal piano, task per task

### Task 1 selettori del pannello dai POI della track

- La catena `withPoiTypeIdentifiers` → `filterFeatures` → `filterFeaturesByInputTyped` sta in una
  funzione esportata in più, `filterTrackPois()` in `store/features/ec/utils.ts`, invece che
  ripetuta nei due selettori.
- `poisStats` è stato spostato più in basso in `ec.selector.ts`, dopo `currentEcRelatedPois`: dipende
  da `currentEcTrack`, che è definito dopo.
- Dopo la review formale stats e contatore derivano da un selettore intermedio unico, per non
  filtrare due volte gli stessi POI e non far divergere voci e contatore.

### Task 2 voce selezionata visibile a 0

- `isPoiOptionVisible()` accetta `selected` come `(string | {identifier: string})[]`, non
  `string[]`: `poiFilters$` contiene gli oggetti opzione, non solo gli identificatori.

### Task 3 azzeramento normalizzazione e ripristino della ricerca

- La normalizzazione di `track`/`poi` insieme a `search` in `initialize()` scattava a ogni lettura
  dei parametri. Con il popup di un POI aperto (nella webapp la home resta visibile) la ricerca
  digitata veniva tolta subito e non partiva mai. Dopo la review formale scatta solo quando `track` o
  `poi` cambiano rispetto all'ultima lettura: apertura, primo caricamento, link.

### Task 4 ricerca ripristinata esclusa da PostHog

- Dopo la review formale `skipSearchTracking` vale solo per la query innescata dalla ricerca
  ripristinata. Prima restava attivo finché non arrivava un nuovo `inputTyped`, e un cambio di
  filtro delle track dopo la X non veniva più tracciato.

## Bug trovati

- Il bloccante del Task 3 descritto sopra, trovato dalla review formale (`wm-review-ticket`).

## Decisioni

- I tag del ticket non sono stati cercati né associati: il dev ha chiesto di lasciarli stare.
- **Layer selezionato:** nessuna modifica nel frontend. Pannello e badge "Luoghi" del box layer
  contano già i POI che hanno quel layer in `properties.layers` (oc:8147). Per il layer 50 il file
  `pois.geojson` dell'app non ne contiene nessuno (0 su 393 il 2026-10-02), mentre i 39 POI della
  track 183 hanno `layers: [50]` e solo 1 è nel file globale. Il layer 130, che funziona, ha 51 POI
  collegati alle sue 5 track, tutti presenti nel file globale.
- **Tipologie mancanti dai filtri:** `MAP.filters.poi_types` della configurazione reale non contiene
  `poi_type_accomodation` né `poi_type_camping`, che sono 26 dei 39 POI della track 183. Il dev ha
  verificato che è un problema di dati: i POI sono inseriti solo come `related_pois` e non come
  globali, e lo risolve il cliente dal backend. Fino ad allora, aprendo la track 183, il pannello
  mostra solo Ristorazione, credenziali e Hotel.
- **POI globali e altre track sulla mappa con una track aperta:** azzerare `search` all'apertura
  toglie il filtro per nome che nascondeva POI globali e altre track
  (`pois.directive.ts:564-568`, `layer.directive.ts:358` in `map-core`). Il dev ha verificato che
  è il comportamento della mappa con una track aperta senza ricerca anche nella versione precedente,
  e ha deciso di non cambiarlo in questo ticket.
- Il filtro delle track (`#track` in `select-filter.component.html`) non mostra le voci selezionate
  a 0: fuori scope, la regola riguarda le tipologie di POI.
- I "Moduli toccati" dell'overview non elencano `filters/select-filter/select-filter.component.ts`,
  `store/features/ec/ec.actions.ts`, `store/user-activity/user-activity.{effects,reducer,selector}.ts`
  e gli spec nuovi; `poisFiltersPanelCount` sta in `store/features/features.selector.ts`, non in
  `ec.selector.ts`.

## Follow-up

- Gli id dello stesso POI sono diversi fra `pois.geojson` e `related_pois` (layer 130: 377–395
  contro 344–353, a parità di nome). Non tocca questo ticket; da segnalare al backend.
- La regola `poi_type_<identifier>` vive in due copie, qui e in
  `map-core/src/directives/track.related-pois.directive.ts`. In `map-core` un POI senza tipologia
  resta visibile con un filtro attivo, qui viene escluso dal conteggio. Sui dati attuali non succede
  (tutti i POI delle track 183 e 1336–1340 hanno `poi_type`).
- Dopo la X, con solo filtri sui POI attivi, la home nasconde il tab "Sentieri" e mostra il layer:
  `showTracks` (`user-activity.selector.ts:155-162`) è falso quando `onlyPoisFilter` è vero.
  Comportamento preesistente, lasciato com'è per decisione del dev; se serve, ticket separato.
- Il ripristino della ricerca vale solo per la X della track: il back di Android e la chiusura di un
  POI non la ripristinano (fuori scope).
