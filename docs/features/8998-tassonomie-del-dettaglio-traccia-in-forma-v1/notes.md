> Ticket: oc:8998

# Notes — Tassonomie del dettaglio traccia in forma v1

## Divergenze dal piano, task per task

### Task 2: lingue null nel name

Il test GeoHub del piano si aspettava `name: {it: 'Escursionismo', en: 'Hiking', sq: null}` copiato
com'è. Il tipo `TaxonomyItem.name` è `Partial<Record<Language, string>>` e non ammette `null`:
l'adapter copia `name` togliendo le lingue con valore `null` o `undefined`, e il test si aspetta
`{it: 'Escursionismo', en: 'Hiking'}`.

Dopo la review del task, l'adapter scarta anche gli elementi di `taxonomy.activity` che non sono
oggetti (`null`, numeri). Dopo la revisione finale scarta anche quelli senza `identifier`, e prende
`taxonomies` tipo per tipo: se `taxonomies` c'è ma non ha `activity`, `activity` si costruisce da
`taxonomy.activity`, come dice l'overview.

### Revisione finale: sottotitolo della lista dei download

Non era un task del piano. `home-result` passa le tracce salvate offline a `search-box` come `Hit`,
e `search-box` mostra come sottotitolo l'ultimo elemento di `taxonomyWheres`. Le copie salvate dopo
questo ticket sono v1 e non hanno più `taxonomyWheres`. `downloadsTracks$` lo ricostruisce da
`taxonomies.where`: solo gli elementi con `admin_level`, ordinati per livello, quindi l'ultimo è il
comune. Una copia salvata prima del ticket e mai aggiornata tiene il suo.

### Dopo la revisione finale: `where` da `taxonomy_where`

L'adapter non costruiva `taxonomies.where` dalle chiavi vecchie in nessun caso, anche se la regola
dell'overview lo ammette quando ci sono `identifier` e `admin_level`. Le prove sui file senza
versione del 24/11 hanno mostrato che i file senza `taxonomies` esistono: maphub app 2 (tracce 1 e
2) e camminiditalia app 1 (traccia 2), mentre `tracks/v1/` risponde 403 su entrambi gli shard. Su
quei file il dettaglio avrebbe perso il luogo, che oggi `track-properties` mostra leggendo
`taxonomy_where`.

Ora, se `taxonomies.where` manca, l'adapter lo costruisce dalla mappa `taxonomy_where`: la chiave
diventa `identifier`, le chiavi che iniziano con `_` (`_admin_level`, `_source`) si tolgono da
`name` e `_admin_level` diventa `admin_level`. GeoHub manda `taxonomy_where: null` e resta senza
`where`. Fixture nuove: `maphub-2-unversioned.json` e `camminiditalia-2-unversioned.json`.

### Review del 24/11: icone inline nella copia offline

La review ha trovato che la copia offline di una traccia GeoHub perdeva l'icona dell'attività:
l'adapter toglie l'SVG inline dall'elemento, la copia salvata è v1, e alla lettura l'adapter non
ha più niente da estrarre. GeoHub non ha `icons.json` (403 sulle app 1, 26, 33 e 49), quindi offline
l'icona non arrivava da nessuna parte; prima del ticket `wm-icon` usava l'SVG dell'elemento.

Ora la copia porta le icone accanto ad `awsVersion` (`StoredEcTrack` in `localForage.ts`):
`saveEcTrack` e `downloadEcTrack` ricevono `icons` opzionale, l'aggiornamento della copia in
`getEcTrackWithIcons` passa le icone dell'adapter, e il ramo cache le consegna all'effect come fa
il ramo rete.

Il download dall'app (`webmapp-app`, `download-panel.component.ts`) salva la traccia dello store,
che non ha più l'SVG: ora passa a `downloadEcTrack` anche lo store delle icone, e
`iconsUsedByTrack` tiene nella copia solo quelle citate da `icon_name` nelle tassonomie della
traccia. È una modifica a un repo in più, `webmapp-app`, sul branch del ticket: compila solo con il
puntatore di `wm-core` che include questo ticket, quindi va nella stessa PR del bump. Verificata
con un type-check del file contro i submodule della webapp.

## Bug trovati

- Nessuno nel codice toccato. La suite di `wm-core` ha 37 test che falliscono anche sullo stato di
  partenza (1164 test, 37 FAILED, verificato su una copia `git archive HEAD` di wm-core, wm-types e
  map-core): `DiaryService` (oc:8169) e il toggle dei preferiti di `home-layer` camminiditalia. Non
  dipendono da questo ticket.

## Decisioni

- Modifica a posteriori, dopo l'implementazione: l'adapter del piano, `utils/track-v1-adapter.ts`
  con `adaptTrackToV1`, è diventato `utils/aws-version-adapter.ts` con
  `adaptTrackToCurrentVersion`, e le fixture stanno in `utils/fixtures/aws-version-adapter/`. Il
  nome non lega più il file a una versione (domani v2) né alle sole tracce: il prossimo passo è
  `pois.geojson`, che avrà la sua funzione accanto. Il prefisso `aws` segue il nome che il codice
  già usa per questi file, `awsApi` dello shard, anche dove non stanno su S3 (Forestas li serve da
  `forestas.dev.maphub.it/wmfe/…`).
- Modifica a posteriori, insieme al nome dell'adapter: la versione non si chiama più
  `TrackVersion`/`Shard.trackVersion` ma è dichiarata **per tipo di file**, come la versiona il
  backend (oc:8997 versiona solo `tracks/`, `pois.geojson` arriverà con un ticket suo). In
  `wm-types/src/aws.ts`: `AwsVersion = 'v1'`, `AwsVersions {tracks?}`, `CURRENT_AWS_VERSIONS`;
  lo shard dichiara `awsVersions: {tracks: 'v1'}` (oggi solo `forestasdev`). L'URL si costruisce
  dalla versione dichiarata (`tracks/<versione>/<id>.json`), e la copia offline porta `awsVersion`.
  Scartata una versione unica per lo shard (`awsVersion`): su `forestasdev` varrebbe per le tracce
  e non per `pois.geojson`, e il primo shard che versiona i due file in tempi diversi la romperebbe.
  Le overview di wm-core e wm-types, approvate prima, usano ancora i nomi `trackVersion`/`TrackVersion`.

- Tag di Orchestrator: il dev ha chiesto di saltare sia i tag di ambiente sia quelli di contenuto.
  Nessun tag associato.
- Stima: il dev ha chiesto di saltarla. `wm-estimate` aveva proposto Misurato 2,21h + Stimato
  3,55h = 5,76h; su Orchestrator non è stato scritto nessun valore.
- Ticket riscritto su Orchestrator (titolo, `customer_request`, `description`) dopo le call del
  17, 18, 19 e 23/11. Durante la riscrittura lo stato è risultato tornato a `todo`, ed è stato
  rimesso a `progress` su richiesta del dev.
- Scope: solo il dettaglio traccia da wmfe. POI, `related_pois`, Elasticsearch, UGC e pbf fuori.
- GeoHub: `where` non si costruisce dai soli nomi (`taxonomyWheres`) né dai soli id
  (`taxonomy.where`). Conseguenza accettata dal dev dopo la revisione finale: nella lista dei
  download le tracce GeoHub salvate dopo il ticket non hanno più il sottotitolo del luogo.
- Tipo chiuso solo v1: l'SVG inline di GeoHub non resta nel dato, va nello store delle icone sotto
  l'`icon_name` dell'elemento (o `txn-<identifier>`); `icons.json` vince sui nomi uguali.
- Nessun ripiego quando `tracks/v1/<id>.json` risponde 404: il frontend si fida della dichiarazione
  dello shard. Su Forestas dev la traccia 780 ha il file senza versione ma non `v1/`: va rigenerata.
- La versione delle copie offline si salva con la copia (`awsVersion`); `saveEcTrack` va chiamato
  solo con tracce già v1, e lo dice il suo JSDoc.
- `getEcTrack` mantiene la firma: il diario (`diaries/active-route.service.ts`) non è stato
  toccato, a differenza di quanto elencava l'overview fra i moduli toccati. Le icone passano da un
  metodo nuovo, `getEcTrackWithIcons`, usato solo dall'effect del dettaglio.
- `wm-txn-where` tiene l'input `taxonomyWheres` (lo usano POI, UGC e `poi-popup` della webapp) e
  riceve un input nuovo, `wheres`, per gli elementi v1.
- Il pipe `wmgetdata`, che nessun template usava, è stato cancellato su richiesta del dev.

## Follow-up

- **POI e `related_pois` in forma v1.** Anche in `tracks/v1/769.json` i `related_pois` portano
  `taxonomy`, `taxonomyWheres` e `taxonomy_where`; `pois.geojson` ne manda cinque forme. Ticket a sé.
- **App (`webmapp-app`)**: il ticket arriva all'app al prossimo aggiornamento dei puntatori. Restano
  nell'app shell due pezzi morti che leggono le chiavi vecchie: `card-big.component.ts:66`
  (`taxonomy.where`, nessun template lo usa) e `geohub.service.ts:60` (copia da localForage senza
  adapter, nessun chiamante). Da pulire in un ticket a parte.
- **Icone GeoHub offline**: risolto nella review del 24/11, vedi sopra. Una copia salvata fra il
  merge di wm-core e la release dell'app con il nuovo `download-panel` resta senza icone finché il
  dettaglio non si riapre con la rete.
- **`WmProperties` con index signature**: il compilatore non segnala letture di `taxonomy_where` o
  `taxonomy` sulla traccia. Toglierla tocca quattro consumer.
- **Accendere v1 su `forestas` e `forestasuat`**: una riga in `wm-types/src/environment.ts` più
  deploy della webapp e release dell'app, quando il backend pubblica v1 in quegli ambienti.
- **I 37 test già rossi di `wm-core`** (diario, preferiti di `home-layer`).
- **`wm-skills`**: la ricerca delle call su Drive con `parentId = '1Q8VVlo9eO_niYkzaSD_go7-SZIBx8Wak'`
  restituisce vuoto; le call si trovano cercando per titolo, e gli shortcut stanno nella cartella
  `1bAIBC-m5p1AlSKTLEpfPU9Zi1IdnFua_`.
