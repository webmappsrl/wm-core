> Ticket: oc:8147

# Filtrare i POI per layer ID nella home

## Cosa cambia

Quando l'utente seleziona un layer nella home, la lista "Punti di interesse" applica due stage di filtraggio in sequenza:

1. **Taxonomy filter** (invariato, già esistente): riduce i POI a quelli che condividono le tassonomie del layer
2. **Layer ID filter** (nuovo, aggiuntivo): se i POI espongono `properties.layers`, filtra ulteriormente tenendo solo quelli la cui lista di layer include l'ID del layer selezionato

Il secondo stage si attiva solo se almeno un POI nella collezione ha `properties.layers` non vuoto (rilevamento a livello di collezione). Se il campo è assente (server legacy), il risultato del primo stage viene restituito invariato — piena retrocompatibilità.

Il badge numerico di ogni layer in home viene allineato alla stessa logica a due stage.

## Perché

Il filtro attuale è basato unicamente su tassonomie condivise: un POI con tema "natura" appare nel tab di qualsiasi layer che ha tema "natura", anche se non è mai stato associato a quel layer nel CMS. Questo gonfia la lista con POI estranei al percorso selezionato. Ogni POI nel GeoJSON espone già `properties.layers` (array di interi) con gli ID dei layer a cui è esplicitamente associato — questa proprietà non veniva usata durante il filtraggio della lista.

## Requisiti

- [ ] Il filtraggio taxonomy esistente rimane il primo stage e non viene modificato
- [ ] Il secondo stage si attiva **solo quando un layer è selezionato** (`currentEcLayer != null`) e almeno un POI nella collezione ha `properties.layers` non vuoto
- [ ] Se nessun POI ha `properties.layers` (server legacy) o nessun layer è selezionato, il secondo stage non viene eseguito e il comportamento è identico all'attuale
- [ ] Guard su `layer.id` non numerico: se `isNaN(+layer.id)`, il secondo stage non si attiva, viene emesso un `console.warn`, e si restituisce il risultato del primo stage (fallback, non lista vuota)
- [ ] I filtri taxonomy selezionati manualmente dall'utente continuano a funzionare come terzo stage (`poisFilteredFeatures`), invariato
- [ ] `calculateLayerFeaturesCount` (badge home) usa la stessa logica a due stage: conta i POI che passano sia il taxonomy check che il layer ID check (con fallback al solo taxonomy se `properties.layers` assente)
- [ ] Nessuna modifica al reducer, alle action, allo stato NgRx, né all'UI

## Rischi

- **Conversione tipo `layer.id`**: `ILAYER.id` è tipizzato come `string` opzionale; `properties.layers` contiene interi. Il confronto usa `+layer.id` (coerente con `styles.ts:674`). Se `isNaN(+layer.id)`: `console.warn` + fallback al risultato taxonomy (non lista vuota).
- **POI associati a più layer**: un POI con `properties.layers: [63, 47]` deve comparire in entrambi i layer. `Array.includes()` gestisce correttamente questo caso.
- **Collezioni miste**: se solo alcuni POI hanno `properties.layers`, il rilevamento a livello di collezione attiva il filtro per tutti — i POI senza il campo verranno esclusi. In produzione questo caso non si verifica (o tutti i POI hanno il campo o nessuno), ma va documentato come comportamento atteso.
- **Backend parzialmente migrato con ID errati**: se `properties.layers` è presente ma contiene ID non corrispondenti al layer selezionato (bug di migrazione backend), la lista risulta vuota senza errori visibili. Non è recuperabile lato client — rischio accettato e documentato.

## Out of scope

- Modifica del comportamento dei filtri manuali taxonomy (`poisFilteredFeatures`, `poisSelectedFilterIdentifiers`)
- Modifica della logica di filtraggio delle tracce (`styles.ts`)
- Modifica del badge count per le tracce (`aggregationBucketsLayers`)
- Aggiornamento del CMS o del server
- Modifiche al reducer o alle action NgRx

## Moduli toccati

Tutti i file sono nel submodule **`wm-core`**:

| File | Tipo di modifica |
|---|---|
| `projects/wm-core/src/store/features/ec/utils.ts` | Aggiunta `filterFeaturesByLayerId()`, aggiornamento `calculateLayerFeaturesCount()` |
| `projects/wm-core/src/store/features/ec/ec.selector.ts` | Aggiornamento `poisWhereFeatures`: secondo stage layer ID dopo il taxonomy filter |
