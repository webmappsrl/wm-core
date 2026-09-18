# Dettaglio di un POI

Cosa rende `wm-poi-properties` e cosa resta a chi lo monta.

## Come funziona oggi

`wm-poi-properties` è l'aggregato del dettaglio di un POI EC, montato da entrambi i prodotti:
`webmapp-app` nel pannello dei dettagli, `wm-webapp` dentro il popup sulla mappa. È **store-only**:
legge `currentPoiProperties`, `poi`, `confPOIFORMS` e `confOPTIONSShowEmbeddedHtml`, e non ha alcun
`@Input`.

Rende, nell'ordine: intestazione (località e nome), **badge dei tipi**, distanza dall'utente,
excerpt, "Galleria", dettagli tecnici, "Dove", descrizione, box configurabili, form in sola lettura,
`info`, indicazioni stradali, "Informazioni", link OSM, audio, HTML incorporato.

**Le tassonomie stanno sotto il titolo** (scrum del 04/09/2026): i badge dei tipi appartengono al
vocabolario dei filtri, quindi si leggono per primi, non in fondo.

**"Informazioni" è un gruppo solo**, con dentro indirizzo, telefoni, mail e link. Un titolo solo
perché "Contatti" mentirebbe sui link di approfondimento — su molti POI `related_url` punta al
comune o a Wikipedia — e perché due gruppi separati costringerebbero a decidere in anticipo quale
dei due ha righe. Le altre sezioni tengono la propria etichetta, "Galleria" compresa, per usare lo
stesso vocabolario del dettaglio della traccia.

**Il confine con chi lo monta.** Nell'intestazione stanno località, nome e
`wm-related-pois-navigator`; il **pulsante di chiusura no**, resta al contenitore. La ragione è che
lì la semantica differisce davvero: nel pannello chiude il dettaglio, nel popup azzera anche
`ec_related_poi`. Tutto il resto dell'intestazione è identico nei due prodotti, quindi vive qui.

**Da dove vengono i dati che non arrivano già pronti dal backend:**

| Cosa si vede | Sorgente | Nota |
|---|---|---|
| Località sopra il nome | `taxonomyWheres`, ultimo elemento | array ordinato regione → provincia → comune |
| Indirizzo in "Informazioni" | `derivePoiAddress()` da `addr_complete`/`addr_locality`/`addr_street` | `address` non esiste nel payload |
| Telefoni | `splitPhones()` su `contact_phone` | il campo è una stringa CSV con etichette dentro |
| Link in "Informazioni" | `normalizeRelatedUrls()` su `related_url` | il campo arriva come oggetto, stringa o array |

**`wm-txn-where` dipende dallo shard.** Consuma `taxonomy_where`, che su geohub è vuoto — 0 POI su
3.252 dell'app 33, 0 su 3.721 dell'app 29 — mentre lì il campo popolato è `taxonomyWheres`, che è
quello da cui l'intestazione prende il comune. Su `camminiditaliadev` invece `taxonomy_where` è
valorizzato e la sezione "Dove" rende davvero, con Comune e Regione (verificato sul POI 377).
Chi vede la sezione sparire non ha un difetto del componente davanti: ha un'app che quel campo non
lo manda.

## Perché così

- **Un solo aggregato, non componenti sparsi montati dai consumer** (oc:8406): prima il dettaglio
  esisteva due volte — qui e riscritto a mano nel popup di `wm-webapp` — e la conseguenza
  misurabile è che `wm-config-detail` (oc:8181) era stato collegato a Layer, EcTrack e al POI
  mobile, ma non alla webapp. Ogni feature sul dettaglio andava fatta due volte o veniva
  dimenticata da una parte.

- **Store-only, nessun `@Input`** (oc:8406): l'ipotesi iniziale era un `@Input` opzionale per
  permettere al popup di passare il proprio POI. Si è rivelata inutile — il popup legge già dallo
  store — e avrebbe lasciato due percorsi dati dentro il componente che esiste per eliminarne uno.

- **L'intestazione dentro, la chiusura fuori** (oc:8406): il criterio non è "sta in alto", è "si
  comporta allo stesso modo nei due prodotti". Titolo e località sì, il pulsante di chiusura no.

- **Un solo gate per la navigazione fra POI correlati** (oc:8406): `canNavigateRelatedPois`, usato
  sia dai pulsanti di `wm-related-pois-navigator` sia dalle scorciatoie da tastiera del popup di
  `wm-webapp`. Dice due cose insieme: che il dettaglio aperto **è** un POI correlato, e che ce n'è
  più di uno.

  La prima metà è quella che non si deduce: il conteggio dei correlati del track **non basta**,
  perché il track resta in stato anche quando il dettaglio aperto è un altro POI.
  `isShowingRelatedPoi` lo stabilisce confrontando **per riferimento** `currentPoiProperties` con
  `currentEcRelatedPoiProperties`: il primo restituisce lo stesso oggetto di uno dei due selettori
  a monte e preferisce quello del POI diretto, quindi il confronto dice quale dei due si sta
  mostrando senza riprodurre la logica del sentinella `{related: false}`.

  **`setPoi` azzera anche `ec_related_poi`** — sia quello di `url-handler`, per le liste, sia
  quello di `geobox-map`, per il tap sulla mappa. Prima non lo faceva, e il parametro restava
  nell'URL: con il gate a posto non si vedeva nulla, ma `removeLatest()` controlla
  `ec_related_poi` **prima** di `poi`, quindi il primo "indietro" lo consumava senza spostare
  niente e ne serviva un secondo. Il gate e l'azzeramento servono tutti e due: il primo protegge
  la resa, il secondo tiene pulita la cronologia.

  **Che il gate sia uno solo conta più di com'è scritto**: prima erano due, il template del
  navigatore e il filtro nel popup, e sono divergiti due volte — con l'indice negativo, e con
  l'`ec_related_poi` rimasto nell'URL. In entrambi i casi le frecce navigavano dove i pulsanti
  erano nascosti.

- **Il ritmo verticale lo impone il corpo, non i singoli componenti** (oc:8406):
  `.wm-poi-properties-body > *` porta `--wm-feature-details-margin`, quindi ogni sezione è
  distanziata allo stesso modo, comprese quelle che verranno aggiunte. Prima quasi tutti i
  componenti dichiaravano quel margine per conto proprio, ma non tutti: l'excerpt usava un padding
  `20px 0 3px 0` — il riquadro era spaziato bene, il testo dentro no, ed era la differenza che si
  notava a occhio — il link OSM e l'HTML incorporato non avevano niente, la distanza azzerava il
  margine sopra.

  **Restano margini e non `gap`**, che sarebbe la forma moderna: i margini verticali adiacenti
  collassano, quindi fra due blocchi resta un solo intervallo, e soprattutto un componente che non
  rende nulla — `wm-config-detail` è sempre montato anche senza dati — collassa attraverso senza
  lasciare spazio vuoto. Con `display: flex` e `gap` ogni host vuoto produrrebbe un buco.

- **Il gate di "Informazioni" non è ridondante** (oc:8406): `hasContacts$` esiste per non lasciare il titolo
  "Informazioni" sospeso sopra il vuoto. Un `*ngIf` sui campi non basterebbe, perché due di essi
  sono truthy anche quando non producono nessuna riga: `related_url` arriva come `[]` su 2.572 POI,
  e `contact_phone` può essere una stringa di sole etichette senza numeri, che `splitPhones` scarta
  per intero. La regola che ne esce vale oltre questo componente: **ogni riga si chiede alla stessa
  funzione che poi la disegna** — `normalizeRelatedUrls` per i link, `splitPhones` per i telefoni —
  perché due condizioni scritte separatamente divergono al primo caso limite.

- **`wm-tab-detail` monta senza la distanza live** (oc:8406): `[showLiveDistance]="false"`. Quel
  componente legge `trackLiveDistanceVm` dallo stato di navigazione globale, non dalle `properties`
  che riceve, quindi in un dettaglio che non è quello della traccia corrente i badge riporterebbero
  i numeri di un'altra feature. Il default dell'input è `true`, così il dettaglio della traccia non
  cambia.

- **`wm-feature-useful-urls` non è montato da qui**, `wm-tab-image-gallery` sì (oc:8406): il primo
  porterebbe un secondo titolo, "Link utili", sopra righe che stanno già sotto "Informazioni", e
  senza `[track]` non rende nient'altro. Il secondo invece porta "Galleria", che è l'etichetta con
  cui quella sezione si chiama anche nel dettaglio della traccia.

- **Nessun override sul rientro delle righe** (oc:8406): "Dettagli tecnici", "Dove" e
  "Informazioni" usano il `--padding-start` che `ion-item` porta di suo. Fino a oc:8406 la webapp
  lo azzerava per il solo `wm-txn-where` in `poi-popup.component.scss`, e il risultato era doppio:
  dentro il dettaglio "Dove" partiva dal bordo mentre le altre due sezioni erano rientrate, e la
  stessa sezione si vedeva diversa qui e nel dettaglio della traccia. Tolta l'eccezione, spariscono
  entrambe le divergenze.

- **La normalizzazione dei dati sta qui, non nei consumer** (oc:8406): `address`, telefoni e link
  richiedono tutti una pulizia prima di essere mostrati, e farla nel consumer significa rifarla due
  volte. Prima della promozione quella logica viveva solo nel popup della webapp, e infatti
  l'indirizzo non era mai visibile sull'app: la riga "Indirizzo" di `wm-tab-detail` leggeva un
  campo che nessuno popolava.

- **Il ramo UGC resta fuori** (oc:8406): `wm-ugc-poi-properties` porta un proprio `ion-header` con
  titolo e chiusura, `wm-image-picker` cancella media senza conferma, e non dispatcha
  `stopDrawUgcPoi` dopo il salvataggio — che sul web serve a chiudere il ridisegno della geometria.
  Instradarvi il popup avrebbe prodotto titolo e pulsanti doppi e due difetti irreversibili sui
  dati. Rinviato a un ticket dedicato.

## Come ci siamo arrivati

- **Intestazione duplicata nei due prodotti** (oc:8406, superata): stava nell'header del pannello e
  nel chrome del popup, con rese divergenti — variabili di tema da una parte, `20px` e `700` fissi
  dall'altra. Il difetto tipico di quella forma è che una modifica su un lato non segnala nulla
  sull'altro: la label della categoria è rimasta sparita dalla webapp senza che test o build se ne
  accorgessero.

- **Categoria sopra il nome** (oc:8406, superata): al suo posto c'è ora il comune. La categoria
  resta comunque visibile, come chip, tramite `wm-poi-types-badges` — che sta subito sotto il
  titolo, non più in fondo.

- **Badge dei tipi in fondo, dopo descrizione e box configurabili** (oc:8406, superata): era così in
  entrambi i prodotti, e l'unificazione l'aveva riprodotto copiando la mobile. La decisione di
  spostarli sotto il titolo era già stata presa nello scrum del 04/09/2026, ma nessuno dei due
  l'aveva recepita: il difetto tipico di una decisione presa a voce e non tracciata su un ticket.

- **Etichette "Contatti" e "Link utili" con un gate ciascuno** (oc:8406, superata): il primo
  tentativo separava i due gruppi e calcolava con due `BehaviorSubject` se mostrarli. Lo scrum
  aveva respinto quella forma — troppa logica nel frontend per dividere dati che credeva
  arrivassero uniti.

- **Nessuna etichetta sui contatti** (oc:8406, superata): applicata alla lettera la decisione dello
  scrum, il gruppo era rimasto senza titolo. È durata poco: il dettaglio della traccia le etichette
  ce le ha ancora, e due schermate dello stesso prodotto che trattano i titoli in modo diverso
  sembrano un lavoro lasciato a metà. Al posto dei due titoli respinti ne è arrivato uno solo,
  "Informazioni".

- **Posizionamento del pannello dentro il componente** (oc:8406): `poi-properties.component.scss`
  dichiara ancora `position: absolute; height: 100%; z-index: 2` sull'host. Non serve a nessuno dei
  due consumer — entrambi lo neutralizzano nel proprio foglio — ma è rimasto per non toccare il
  layout di entrambi i prodotti in un ciclo già ampio.
