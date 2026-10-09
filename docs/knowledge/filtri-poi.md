# Filtro dei POI: tassonomia, layer ID e binding multi-direttiva

## Come funziona oggi

**La sezione "Punti di interesse" del pannello "Filtri" ha due fonti, secondo che ci sia o no una track aperta.**

- **Senza track** conta i POI globali dell'istanza, in due stage in sequenza. Il primo riduce i POI a quelli che condividono le tassonomie del layer selezionato; il secondo, se i POI espongono `properties.layers`, tiene solo quelli la cui lista di layer include l'ID del layer corrente (`filterFeaturesByLayerId()` in `store/features/ec/utils.ts`, applicata da `poisWhereFeatures` in `ec.selector.ts`). I filtri di tassonomia scelti a mano dall'utente restano un terzo stage separato (`poisFilteredFeatures`). Il secondo stage si attiva solo se un layer è selezionato e se almeno un POI della collezione ha `properties.layers` non vuoto: su un server legacy che non espone il campo, il comportamento è identico a prima. Il badge numerico di ogni layer in home (`calculateLayerFeaturesCount`) usa la stessa logica a due stage, così conteggio e lista non possono divergere.
- **Con una track aperta** voci e conteggi vengono dai `related_pois` della track (`currentEcRelatedPois`), non dai POI globali. Se la track non ne ha, la sezione è vuota: non si ricade sui globali. I POI della track filtrati stanno in un selettore unico, `trackPanelPois` in `ec.selector.ts`, costruito con `filterTrackPois()` (`store/features/ec/utils.ts`): somma le tipologie selezionate e il testo di ricerca ma **non** applica lo stage "where" (`filterTaxonomies`), come non lo applica la mappa. Da lì derivano sia le voci (`poisStats`) sia il contatore nell'intestazione della sezione (`poisFiltersPanelCount` in `features.selector.ts`), che quindi non divergono.

**Le tipologie di un POI della track si leggono da `taxonomyIdentifiers`; se manca, da `taxonomy.poi_type.identifier` come `poi_type_<identifier>`** (`withPoiTypeIdentifiers()`). È la stessa regola di `track.related-pois.directive.ts` in `map-core`: pannello e mappa contano le stesse cose. Le copie sono due perché `map-core` non può importare da `wm-core`; un test in `utils.spec.ts` fissa il formato, e il commento in `utils.ts` rimanda a `map-core` (non il contrario).

**`ecPois`, `countEcPois` e `countPois` non cambiano**: li usano anche la scelta del tab in home (`home-result.component.ts`) e i POI globali della mappa (`geobox-map.component.ts`). Per questo il pannello ha selettori propri, che oggi servono solo a lui.

**Una tipologia selezionata resta visibile anche con conteggio 0**, evidenziata e deselezionabile (`isPoiOptionVisible()` in `select-filter.component.ts`). Vale con e senza track. Chiudere la track non tocca le tipologie selezionate.

**Aprire una `track` o un `poi` toglie `search` dall'URL.** La regola sta in `UrlHandlerService.updateURL()`, da cui passano tutte le aperture (lista, home, click sulla mappa, "tappa precedente/successiva"). Anche i link e i ricaricamenti con `track` o `poi` **e** `search` insieme si normalizzano alla lettura dei parametri in `initialize()`: `search` esce dall'URL con `replaceUrl`, senza aggiungere un passo alla cronologia. La normalizzazione scatta solo quando `track` o `poi` cambiano rispetto all'ultima lettura (`_opensTrackOrPoiWithSearch()`): una ricerca digitata con un POI già aperto resta com'è. La regola non vale per `ugc_track` e `ugc_poi`; il layer azzera `search` da sé (`setLayer()`), senza ripristino.

**Il testo tolto si conserva in una copia salvata** (`_savedSearch`, in memoria nel service), che la X della track rimette nell'URL tramite `closeTrack()`. Tre regole:

1. si salva solo se c'è un `search` non vuoto all'apertura di una track o di un POI, quindi aprire un POI dalla track non sovrascrive la copia;
2. si cancella appena nell'URL non c'è più nessuna track, comunque la si chiuda (X, indietro del browser, back di Android, home);
3. passare da una tappa all'altra la conserva.

**Una ricerca ripristinata non conta come ricerca su PostHog.** `initialize()` marca `restored` l'azione `inputTyped` quando `search` ricompare dopo che una track o un POI è stato chiuso; l'effetto in `user-activity.effects.ts` lo traduce in `skipSearchTracking` solo sulla query innescata da quel testo, e `ec.effects.ts` salta `searchPerformed`. Una query successiva per un cambio di filtri delle track o di layer, con lo stesso testo, resta tracciata. La query delle track parte comunque, così la lista dei risultati torna.

**Il filtro per tipologia raggiunge anche i related POI della traccia sulla mappa**: il binding `[wmMapPoisFilters]` su `geobox-map.component.html` alimenta sia i POI globali sia `wmMapTrackRelatedPois`. Angular propaga un `@Input()` a tutte le direttive che stanno sullo stesso host element e dichiarano quel nome, quindi non serve un secondo binding.

## Perché così

- **Il filtro per sola tassonomia gonfiava la lista** (oc:8147): un POI con tema "natura" compariva sotto qualsiasi layer con tema "natura", anche senza essere mai stato associato a quel layer nel CMS. `properties.layers` era già nel GeoJSON e non veniva letto.
- **Il rilevamento del server guarda `allEcpoiFeatures`, non il risultato del primo stage** (oc:8147): se guardasse la collezione già filtrata, un layer senza tassonomie su un server nuovo darebbe 0 elementi e farebbe concludere erroneamente "server legacy".
- **Guard su `layer.id` non numerico** (oc:8147): `ILAYER.id` è tipizzato `string`, `properties.layers` contiene interi. Il confronto usa `+layer.id`; se `isNaN`, si emette un `console.warn` e si ricade sul risultato del solo primo stage — mai una lista vuota.
- **Nessun binding aggiunto per i related POI** (oc:7646): il piano prevedeva di aggiungerne uno, ma la propagazione automatica di Angular lo rendeva superfluo. La modifica reale è stata riposizionare il binding esistente secondo la convenzione: gli input condivisi fra più direttive vanno alla fine del gruppo di attributi generali, prima del primo selettore di direttiva; quelli dedicati dopo il selettore della propria direttiva. La convenzione è documentata nel `CLAUDE.md` di `map-core`.
- **Il pannello contava i POI sbagliati** (oc:8684): `poisStats` leggeva solo i POI globali, mentre sulla mappa con una track aperta si vedono i suoi `related_pois`. Il pannello poteva restare vuoto con POI visibili.
- **Il testo di ricerca restava nell'URL aprendo una track** (oc:8684): i conteggi passavano dal filtro per nome `inputTyped`, e un testo come il nome del layer escludeva tutti i POI. Si toglie in `updateURL()` e non in `setTrack`/`setPoi`, perché molte aperture (click sulla mappa, "tappa successiva") non passano da lì.
- **La regola vale anche alla lettura dei parametri, ma solo all'apertura** (oc:8684): i link e i ricaricamenti con `track` e `search` insieme aggirerebbero `updateURL()`. Applicata a ogni lettura, cancellava la ricerca digitata con il popup di un POI aperto, perché nella webapp la home resta visibile accanto al popup.
- **La copia salvata ha regole di cancellazione** (oc:8684): senza, la X rimetterebbe una ricerca vecchia in un contesto diverso. Per questo si cancella quando la track non c'è più nell'URL, non solo alla X.
- **`restored` esclude la ricerca da PostHog** (oc:8684): ogni X produrrebbe un `searchPerformed` che l'utente non ha digitato.
- **Selettori dedicati al pannello** (oc:8684): cambiare `ecPois` o `countPois` avrebbe spostato tab della home e POI globali della mappa.
- **La voce selezionata resta visibile a 0** (oc:8684): senza, una selezione che azzera i POI non si potrebbe togliere e la mappa vuota non avrebbe una causa leggibile.

## Comportamenti attesi e debito noto

- **Collezione mista** (oc:8147): se solo una parte dei POI ha `properties.layers`, il rilevamento a livello di collezione attiva comunque il filtro e gli altri vengono esclusi. In produzione il caso non si presenta — o tutti i POI hanno il campo, o nessuno.
- **Backend migrato a metà con ID sbagliati** (oc:8147): la lista risulta vuota senza alcun errore visibile, e il client non può accorgersene. Rischio accettato.
- **La logica di filtro dei related POI vive in `map-core`** (oc:7646): il binding qui è inutile se `map-core` non è aggiornato con l'input corrispondente, quindi le due modifiche vanno deployate insieme.
- **Layer 50 (Cammini d'Italia): con il layer selezionato il pannello è vuoto** (oc:8684). Il file `pois.geojson` dell'app non contiene POI con `layers: [50]` (0 su 393 al 2026-10-02, misura nel cantiere `docs/features/8684-poi-non-visibili-nella-sezione-filtri-dellapp/notes.md`), mentre la track 183 ne ha 39. Il filtro per layer di oc:8147 è corretto e conta quello che il file offre; con una track aperta il pannello mostra comunque i suoi POI. La correzione sta nel backend che genera il file.
- **Una track senza `related_pois` mostra la sezione vuota** (oc:8684), senza ricadere sui POI globali.
- **Aprendo una track dalla ricerca, sulla mappa compaiono anche i POI globali e le altre track** (oc:8684). Prima li nascondeva il testo di ricerca rimasto nell'URL, che filtra per nome anche la mappa (`pois.directive.ts` e `layer.directive.ts` in `map-core`, via `[wmMapInputTyped]`). Azzerato `search`, la mappa è quella di una track aperta senza ricerca, com'era già prima. Nascondere POI globali e altre track con una track aperta sarebbe una regola nuova della mappa.
