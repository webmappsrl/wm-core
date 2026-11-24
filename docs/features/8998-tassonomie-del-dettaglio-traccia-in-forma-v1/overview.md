> Ticket: oc:8998

# Tassonomie del dettaglio traccia in forma v1

## Cosa cambia

Il dettaglio traccia (`tracks/<id>.json` su wmfe) arriva allo store e ai componenti **sempre
nella forma v1**: le tassonomie della traccia stanno solo in `properties.taxonomies`, e le chiavi
vecchie (`taxonomy`, `taxonomy_where`, `taxonomyWheres`) non esistono più al primo livello delle
properties dopo l'ingresso.

- Ogni shard dichiara nella propria entry di `wm-types/src/environment.ts` quale versione del
  file traccia pubblica (`trackVersion`, per ora solo `'v1'`). Senza dichiarazione vale il file
  senza versione. Il `config.json` dell'app non porta nessuna informazione sulla versione.
- `EcService.getEcTrack` costruisce l'URL in base alla dichiarazione:
  `tracks/v1/<id>.json` se lo shard dichiara `v1`, `tracks/<id>.json` altrimenti. **Nessun
  ripiego**: se il file v1 manca, va rigenerato dal backend.
- Un **adapter**, funzione pura in un file a sé di `wm-core`, porta a v1 un dato che non lo è.
  Si applica in `getEcTrack` sia alla risposta HTTP sia alla copia da localForage.
- **Le copie offline si salvano sempre in v1**, con la versione accanto. Ogni copia scritta dopo
  questo ticket è v1; una copia senza versione è stata salvata prima e passa dall'adapter.
- I componenti del dettaglio traccia leggono solo `taxonomies`: `track-properties`
  (`wm-txn-where`, `wm-tab-howto`) e `tab-howto`.
- Un tipo **chiuso** per `taxonomies` e per il suo elemento, in `wm-types`.
- Il pipe `wmgetdata`, che nessun template usa, viene cancellato.

### La regola dell'adapter

Conta solo **se il dato è v1 o no**, non da quale piattaforma arriva.

- **v1** → il dato resta invariato.
- **Non v1** → una regola sola, qualunque sia la provenienza:
  - `taxonomies.<tipo>` si prende da `taxonomies` se c'è; altrimenti si costruisce dalle chiavi
    vecchie disponibili: `activity` da `taxonomy.activity` (`identifier`, `name`, `icon_name`).
  - `where` si costruisce solo se ci sono `identifier` e `admin_level`. Dai soli nomi
    (`taxonomyWheres`) o dai soli id numerici (`taxonomy.where`) non si costruisce nulla: un dato
    che manca si dichiara assente invece di inventarlo.
  - un elemento con l'SVG inline (`icon`) produce un'icona da registrare (vedi sotto).
  - `taxonomy`, `taxonomy_where` e `taxonomyWheres` si tolgono dalle properties della traccia.
- L'adapter è **idempotente**: un dato già v1 passato dal ramo «non v1» esce invariato.
- Agisce **solo sulle properties della traccia, al primo livello**. I `related_pois` restano
  come arrivano: anche in `tracks/v1/769.json` portano ancora `taxonomy`, `taxonomyWheres` e
  `taxonomy_where`, e li leggono `track-related-poi.component.html:14` e
  `track.related-pois.directive.ts` in map-core.

Esempi reali, usati come fixture:

| File | Cosa trova l'adapter | Cosa esce |
|---|---|---|
| Forestas dev `tracks/v1/769.json` | v1 | invariato |
| Forestas dev `tracks/769.json` | `taxonomies` più le tre chiavi vecchie | `taxonomies` com'è, chiavi vecchie tolte |
| GeoHub `tracks/100.json` | solo `taxonomy` e `taxonomyWheres` | `taxonomies.activity`, nessun `where`, chiavi vecchie tolte, SVG delle activity come icone |

Oggi il dettaglio di una traccia GeoHub non mostra comunque nessun luogo:
`track-properties.component.html:45` richiede `taxonomy_where`, che GeoHub non manda.

### Icone inline

v1 non ha l'SVG inline. L'adapter non lo mette nel dato: restituisce `{feature, icons}`, dove
`icons` è la mappa `icon_name → svg` degli elementi che ne avevano uno. Il nome è l'`icon_name`
dell'elemento, oppure `txn-<identifier>` se manca, e l'elemento v1 porta quel nome.

- `getEcTrack` consegna le icone a chi lo chiama, senza toccare lo store: `EcService` resta
  senza dipendenza da NgRx, e il diario (`diaries/active-route.service.ts:242`) riceve solo la
  traccia come oggi.
- Il dispatch lo fa l'effect del dettaglio traccia in `ec.effects.ts`, con una nuova action che
  **aggiunge** icone allo store.
- `loadIconsSuccess` passa da sostituzione a **merge**: se la traccia arriva prima di
  `icons.json` (dettaglio aperto da link diretto), le icone registrate non vanno perse.
- **Vince `icons.json`**: un SVG inline si registra solo per un nome che `icons.json` non ha, e
  `icons.json` sovrascrive un nome registrato prima del suo arrivo. È l'ordine che `wm-icon`
  applica già oggi, dove l'SVG inline è solo il ripiego.

## Perché

Le tassonomie della traccia arrivano oggi in forme diverse a seconda della piattaforma e della
versione del file, e i template le leggono una per una con una catena di `*ngIf`. Il backend
(oc:8997) pubblica `tracks/v1/<id>.json` con la sola `taxonomies` e lascia in vita il file senza
versione, che GeoHub manderà sempre. Allo scrum del 18/11 e del 19/11 il team ha deciso di non
duplicare i componenti per versione ma di scrivere il codice sull'ultima versione e
**normalizzare il dato vecchio prima che arrivi allo store**: un connettore fra il file JSON e lo
state NgRx, che sa la versione dall'URL. Forestas è il primo shard che passa a v1.

## Requisiti

- [ ] La entry di uno shard in `wm-types/src/environment.ts` può dichiarare `trackVersion: 'v1'`;
      `forestasdev` la dichiara. `forestas` e `forestasuat` no, finché il backend non pubblica
      v1 in quegli ambienti
- [ ] `getEcTrack` scarica `tracks/v1/<id>.json` per uno shard che dichiara `v1`, e
      `tracks/<id>.json` per tutti gli altri, senza ripiego fra i due
- [ ] Un adapter puro applica la regola sopra e restituisce `{feature, icons}`; è idempotente
- [ ] L'adapter si applica in `getEcTrack` sia alla risposta HTTP sia alla copia da localForage
- [ ] Ogni copia offline scritta dopo questo ticket è v1 e porta la versione: `getEcTrack`
      normalizza prima di chiamare `saveEcTrack`, e il download dall'app salva la traccia dello
      store, già v1. Una copia senza versione passa dall'adapter
- [ ] `getEcTrack` non dipende dallo store; l'effect del dettaglio traccia registra le icone con
      una nuova action che le aggiunge
- [ ] `loadIconsSuccess` fa merge; `icons.json` vince sui nomi uguali, in qualunque ordine
      arrivino i due dati
- [ ] Esiste un tipo chiuso per `taxonomies` e per il suo elemento (`identifier`, `name`,
      `icon_name?`, `admin_level?`), senza index signature
- [ ] `track-properties` e `tab-howto` leggono solo `taxonomies`; nessun componente del
      dettaglio traccia legge più `taxonomy`, `taxonomy_where` o `taxonomyWheres`
- [ ] `wm-txn-where` riceve gli elementi `taxonomies.where` e mostra regioni, province e comuni
      come oggi
- [ ] Il pipe `wmgetdata` è cancellato, con la sua dichiarazione in `PipeModule`
- [ ] Il dettaglio traccia mostra le stesse attività, icone e luoghi di prima su: una traccia
      Forestas dev in v1, una traccia di uno shard senza versione, una traccia GeoHub
- [ ] Spec dell'adapter con le tre fixture reali: uscita attesa per ognuna, nessuna delle tre
      chiavi vecchie al primo livello delle properties, `related_pois` invariati, idempotenza

## Rischi

- **Il compilatore non protegge le chiavi vecchie al primo livello.** Le properties della
  traccia sono `LineStringProperties`, che estende `WmProperties`: dichiara ancora
  `taxonomy_where` (serve a UGC e POI) e finisce con `[key: string]: any`. Una lettura di
  `taxonomy_where` sulla traccia continua a compilare. Il tipo chiuso protegge solo l'interno di
  `taxonomies`; che le chiavi vecchie non ci siano più lo garantisce la spec dell'adapter.
  Togliere l'index signature da `WmProperties` tocca quattro consumer ed è fuori da questo ticket.
- **Un file v1 mancante apre un dettaglio vuoto.** Su Forestas dev la traccia 780 risponde 200
  sul file senza versione e 404 su `v1/`. Il frontend si fida della dichiarazione dello shard:
  il file va rigenerato dal backend.
- **Copie offline salvate prima del ticket**: non hanno la versione, passano dall'adapter e
  arrivano al componente in forma v1.
- **`loadIconsSuccess` da sostituzione a merge**: un'app che ricarica `icons.json` dopo un
  cambio di configurazione tiene le icone vecchie non più presenti. Un nome che non esiste più
  non è referenziato da nessun dato, quindi non si vede.
- **Il passaggio a v1 di uno shard è una modifica al frontend**: dichiarare `trackVersion` su
  `forestas`, o toglierlo, richiede un deploy della webapp e una release dell'app.

## Out of scope

- I POI (`pois.geojson`) e i `related_pois` dentro il file traccia, che anche in v1 portano le
  chiavi vecchie: sarà un ticket a sé.
- Gli `Hit` di Elasticsearch (`search-box`, `home-result`): non sono file su wmfe.
- Le tracce UGC (`ugc-track-properties`, `taxonomy_where`): non vengono da wmfe.
- Le vector tile pbf (`styles.ts:772-776`): le produce il backend.
- Le altre properties che v1 toglie o riduce (`related_pois`, `feature_image`, `walkability`).

## Moduli toccati

**`wm-types`**
- `src/environment.ts` — `Shard.trackVersion?`, dichiarazione su `forestasdev`
- un file nuovo per il tipo chiuso di `taxonomies` e del suo elemento; `WmProperties` lo usa

**`wm-core`** (`projects/wm-core/src/`)
- adapter nuovo, funzione pura, e la sua spec con le fixture
- `store/features/ec/ec.service.ts` — URL versionato, adapter in `getEcTrack`, icone consegnate
  a chi chiama, normalizzazione prima di `saveEcTrack`
- `store/features/ec/ec.effects.ts` — dispatch delle icone accanto a `loadCurrentEcTrackSuccess`
- `diaries/active-route.service.ts` — adeguamento alla nuova uscita di `getEcTrack`
- `utils/localForage.ts` — `saveEcTrack` salva la versione, `getEcTrack` la restituisce
- `store/icons/icons.actions.ts`, `icons.reducer.ts` — action per aggiungere icone, merge in
  `loadIconsSuccess`, precedenza di `icons.json`
- `track-properties/track-properties.component.html`, `tab-howto/tab-howto.component.html` —
  lettura da `taxonomies`
- `taxonomy-where/taxonomy-where.component.ts` — input dagli elementi `taxonomies.where`
- `pipes/wm-get-data.pipe.ts`, `pipes/pipe.module.ts` — cancellazione di `wmgetdata`

**`wm-webapp`**
- puntatori dei submodule `wm-core` e `wm-types`
