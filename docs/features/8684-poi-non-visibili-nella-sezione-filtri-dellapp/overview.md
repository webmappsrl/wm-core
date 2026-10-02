> Ticket: oc:8684

# POI non visibili nella sezione "Filtri" dell'app

## Cosa cambia

Con una track aperta, la sezione "Punti di interesse" del pannello "Filtri" propone le tipologie
dei **POI collegati alla track** (`related_pois`), con i loro conteggi, invece delle tipologie dei
POI globali dell'istanza. Scegliere una tipologia filtra i POI della track sulla mappa: quella
parte funziona già, in `map-core`.

Aprire una track o un POI, da qualunque punto, azzera il **solo testo di ricerca** (`search`
nell'URL, `inputTyped` nello store), come già fa l'apertura di un layer. Tipologie di POI
selezionate, filtri sulle track e layer restano attivi. La X della track ripristina il testo di
ricerca che c'era prima di aprirla.

Le tipologie selezionate restano sempre visibili nel pannello, anche quando il loro conteggio è 0,
così l'utente può toglierle.

## Perché

Il cliente (Cammini d'Italia, layer 50 "La Rotta dei Due Mari", track 183) apre una tappa dalla
ricerca e trova la sezione "Punti di interesse" vuota, mentre sulla mappa ci sono alloggi,
campeggi e ristoranti lungo la tappa.

Le cause sono due, e si sommano:

- il pannello conta solo i POI globali (`poisStats` su `ecPoiFeatures`, `ec.selector.ts:166-173`)
  e non legge mai i POI della track, che sono quelli visibili sulla mappa;
- i conteggi vengono calcolati dopo il filtro per nome `inputTyped` (`ec.selector.ts:122-127`), e
  il testo «rotta dei due mari», rimasto nell'URL dopo la ricerca, esclude tutti i POI.

Sui dati reali la track 183 ha 39 POI collegati, tutti con `taxonomy.poi_type` e nessuno con
`taxonomyIdentifiers`: 24 `accomodation`, 9 `catering`, 3 `vf-credentials-point`, 2 `camping`,
1 `hotel`.

## Requisiti

### Pannello con una track aperta

- [ ] Con una track aperta, le voci di "Punti di interesse" e i loro conteggi vengono dai
      `related_pois` della track (`currentEcRelatedPois`), non dai POI globali. Se la track non
      ha `related_pois`, o li ha vuoti, la sezione è vuota: non si ricade sui POI globali.
- [ ] Le tipologie di un POI della track si leggono da `taxonomyIdentifiers`; se manca, da
      `taxonomy.poi_type.identifier` come `poi_type_<identifier>`. È la stessa regola di
      `track.related-pois.directive.ts:347-351` in `map-core`, così pannello e mappa contano le
      stesse cose.
- [ ] I filtri si sommano anche sulla track: i conteggi tengono conto delle tipologie selezionate
      e del testo di ricerca, se c'è. Lo stage "where" (`filterTaxonomies`) non si applica ai POI
      della track, come non lo applica la mappa.
- [ ] Il contatore nell'intestazione della sezione è coerente con le voci: con una track aperta
      conta i POI della track.
- [ ] Il pannello usa **selettori dedicati**: `poisStats`, che oggi usa solo il pannello, e un
      contatore nuovo per l'intestazione. `ecPois`, `countEcPois` e `countPois` restano
      invariati, perché li usano anche la scelta del tab in home (`home-result.component.ts:171`,
      `:177`) e i POI globali della mappa (`geobox-map.component.ts:287`).
- [ ] Senza una track aperta il pannello si comporta come oggi, compreso il filtro per layer di
      oc:8147.
- [ ] Una tipologia selezionata resta visibile nel pannello anche con conteggio 0, evidenziata e
      deselezionabile. Vale con e senza track.
- [ ] Chiudere la track non tocca le tipologie selezionate: il filtro resta attivo sulla mappa
      generale.

### Azzeramento e ripristino della ricerca

- [ ] La regola sta in `UrlHandlerService.updateURL()`, da cui passano tutte le aperture: lista
      dei risultati, home, click sulla mappa (`geobox-map.component.ts:576`, `:619`, `:704`),
      "tappa precedente/successiva" (`track-edges.component.ts:60`). Quando la chiamata apre una
      `track` o un `poi` e nell'URL c'è un `search`, `updateURL()` lo toglie.
- [ ] Anche i link e i ricaricamenti con `track` o `poi` **e** `search` insieme si normalizzano
      alla lettura dei parametri: `search` si toglie dall'URL senza aggiungere un passo alla
      cronologia, e si conserva come copia salvata.
- [ ] Le regole valgono per `track` e `poi`. `ugc_track` e `ugc_poi` restano come oggi.
- [ ] Il layer resta com'è oggi: `setLayer()` azzera già `search`, senza ripristino.
- [ ] **Copia salvata per la X**, tenuta in memoria nel service:
  - si salva solo se c'è un `search` non vuoto quando si apre una track o un POI, quindi aprire
    un POI dalla track non la sovrascrive;
  - si cancella non appena nell'URL non c'è più nessuna track, comunque la si chiuda: X, indietro
    del browser, back di Android (`removeLatest()`), home;
  - passare da una tappa all'altra la conserva.
- [ ] La X della track (`TrackPropertiesComponent.close()`) rimette nell'URL la copia salvata,
      poi la cancella. Senza copia si comporta come oggi.
- [ ] Una ricerca ripristinata dalla X rilancia la query delle track, così la lista dei risultati
      torna, ma **non** produce l'evento PostHog `searchPerformed` (`ec.effects.ts:86-90`). Le
      ricerche dalla search bar restano tracciate come oggi.

### Generali

- [ ] Nessun testo nuovo visibile all'utente: le etichette delle voci vengono dalla
      configurazione (`map.filters.poi_types`), quindi non servono chiavi i18n.
- [ ] Test unitari in `wm-core` per:
  - conteggi e contatore dai POI della track, con la ricaduta su `taxonomy.poi_type`;
  - voce selezionata a 0;
  - azzeramento di `search` in `updateURL()` per `track` e `poi`, e normalizzazione dei link;
  - le tre regole della copia salvata e il ripristino nella X;
  - assenza di `searchPerformed` sulla ricerca ripristinata.
- [ ] [UX] Lo stato del pannello è leggibile: la voce attiva è evidenziata anche a 0, così una
      mappa senza POI ha una causa visibile.
- [ ] [UX] L'URL riflette lo stato: dopo l'apertura della track non contiene più `search`, e
      l'indietro del browser riporta all'URL con la ricerca.

## Rischi

- **Aperture che non passano da `setTrack`/`setPoi`** (click sulla mappa, "tappa successiva"):
  avrebbero lasciato attiva la ricerca. Mitigato mettendo la regola in `updateURL()`.
- **Link e ricaricamenti con `track` e `search`**, come l'URL dello screenshot del cliente:
  mitigato normalizzando i parametri alla lettura.
- **Copia salvata orfana**, che la X rimetterebbe in un contesto diverso: mitigato con le tre
  regole su quando si salva e quando si cancella.
- **Ricerche fittizie su PostHog** a ogni X: mitigato escludendo le ricerche ripristinate.
- **Contatori condivisi con home e mappa**: mitigato con selettori dedicati al pannello.
- **La regola `poi_type_<identifier>` vive in due copie**, in `wm-core` e in `map-core`, senza
  un'astrazione comune. Un test in `wm-core` fissa il formato, e un commento rimanda all'altra
  copia.
- **La modifica arriva anche all'app** (`webmapp-app`), che monta lo stesso `wm-core`. Un rollback
  richiede un revert qui e un aggiornamento del submodule in entrambi i prodotti, e per l'app una
  nuova release sugli store.
- **Con la ricerca azzerata tornano i POI globali e le track vicine alla track aperta**, filtrati
  solo per tipologia. È il comportamento che si ha già oggi aprendo una track senza cercare.
- [UX] **Una track senza POI collegati** mostra la sezione "Punti di interesse" vuota, come oggi.

## Out of scope

- **I POI dei layer che mancano dal file dei POI globali.** Con un layer selezionato, pannello e
  badge "Luoghi" del box layer contano già i POI che hanno quel layer in `properties.layers`
  (oc:8147, `calculateLayerFeaturesCount`). Per il layer 50 il file `pois.geojson` dell'app non ne
  contiene nessuno (0 su 393), mentre la track 183 ne ha 39 con `layers: [50]`. La correzione sta
  nel backend che genera quel file.
- Azzerare il filtro per nome sui POI globali della mappa quando è aperto un layer.
- Ripristinare la ricerca chiudendo un POI o un layer, o con modi diversi dalla X della track.
- Cercare per nome mentre una track è aperta nella webapp: oggi la barra di ricerca è nascosta
  insieme a `wm-home`.

## Moduli toccati

Tutti nel submodule `wm-core` (`projects/wm-core/src/`), salvo dove indicato.

- `store/features/ec/ec.selector.ts`: `poisStats` e il contatore nuovo dai POI della track
- `store/features/ec/utils.ts`: tipologie di un POI con la ricaduta su `taxonomy.poi_type`
- `filters/select-filter/select-filter.component.html`: voce selezionata visibile a 0, contatore
  dedicato
- `filters/filters.component.ts`: contatore dedicato della sezione
- `services/url-handler.service.ts`: regola in `updateURL()`, normalizzazione dei parametri, copia
  salvata
- `track-properties/track-properties.component.ts`: `close()` ripristina la copia salvata
- `store/user-activity/user-activity.action.ts` e `store/features/ec/ec.effects.ts`:
  informazione "ripristinata" sulla ricerca, esclusa da `searchPerformed`
- spec: `store/features/ec/utils.spec.ts`, `services/url-handler.service.spec.ts`, uno spec nuovo
  per i selettori
- `docs/knowledge/filtri-poi.md`: aggiornata a fine lavoro
- **In `wm-webapp`**: un test Cypress con fixture, descritto nell'overview di quel repo
