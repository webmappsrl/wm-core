# Filtro dei POI: tassonomia, layer ID e binding multi-direttiva

## Come funziona oggi

**La lista "Punti di interesse" filtra in due stage in sequenza.** Il primo riduce i POI a quelli che condividono le tassonomie del layer selezionato; il secondo, se i POI espongono `properties.layers`, tiene solo quelli la cui lista di layer include l'ID del layer corrente (`filterFeaturesByLayerId()` in `store/features/ec/utils.ts`, applicata da `poisWhereFeatures` in `ec.selector.ts`). I filtri di tassonomia scelti a mano dall'utente restano un terzo stage separato (`poisFilteredFeatures`), invariato.

Il secondo stage si attiva solo se un layer è selezionato e se almeno un POI della collezione ha `properties.layers` non vuoto: su un server legacy che non espone il campo, il comportamento è identico a prima. Il badge numerico di ogni layer in home (`calculateLayerFeaturesCount`) usa la stessa logica a due stage, così conteggio e lista non possono divergere.

**Lo stesso filtro raggiunge anche i related POI della traccia.** Il binding `[wmMapPoisFilters]` su `geobox-map.component.html` alimenta sia i POI globali sia `wmMapTrackRelatedPois`: Angular propaga un `@Input()` a tutte le direttive che stanno sullo stesso host element e dichiarano quel nome, quindi non serve un secondo binding.

## Perché così

- **Il filtro per sola tassonomia gonfiava la lista** (oc:8147): un POI con tema "natura" compariva sotto qualsiasi layer con tema "natura", anche senza essere mai stato associato a quel layer nel CMS. `properties.layers` era già nel GeoJSON e non veniva letto.
- **Il rilevamento del server guarda `allEcpoiFeatures`, non il risultato del primo stage** (oc:8147): se guardasse la collezione già filtrata, un layer senza tassonomie su un server nuovo darebbe 0 elementi e farebbe concludere erroneamente "server legacy".
- **Guard su `layer.id` non numerico** (oc:8147): `ILAYER.id` è tipizzato `string`, `properties.layers` contiene interi. Il confronto usa `+layer.id`; se `isNaN`, si emette un `console.warn` e si ricade sul risultato del solo primo stage — mai una lista vuota.
- **Nessun binding aggiunto per i related POI** (oc:7646): il piano prevedeva di aggiungerne uno, ma la propagazione automatica di Angular lo rendeva superfluo. La modifica reale è stata riposizionare il binding esistente secondo la convenzione: gli input condivisi fra più direttive vanno alla fine del gruppo di attributi generali, prima del primo selettore di direttiva; quelli dedicati dopo il selettore della propria direttiva. La convenzione è documentata nel `CLAUDE.md` di `map-core`.

## Comportamenti attesi e debito noto

- **Collezione mista** (oc:8147): se solo una parte dei POI ha `properties.layers`, il rilevamento a livello di collezione attiva comunque il filtro e gli altri vengono esclusi. In produzione il caso non si presenta — o tutti i POI hanno il campo, o nessuno.
- **Backend migrato a metà con ID sbagliati** (oc:8147): la lista risulta vuota senza alcun errore visibile, e il client non può accorgersene. Rischio accettato.
- **La logica di filtro dei related POI vive in `map-core`** (oc:7646): il binding qui è inutile se `map-core` non è aggiornato con l'input corrispondente, quindi le due modifiche vanno deployate insieme.
