# Dettaglio di un POI

Cosa rende `wm-poi-properties` e cosa resta a chi lo monta.

## Come funziona oggi

`wm-poi-properties` è l'aggregato del dettaglio di un POI EC, montato da entrambi i prodotti:
`webmapp-app` nel pannello dei dettagli, `wm-webapp` dentro il popup sulla mappa. È **store-only**:
legge `currentPoiProperties`, `poi`, `confPOIFORMS` e `confOPTIONSShowEmbeddedHtml`, e non ha alcun
`@Input`.

Rende, nell'ordine: intestazione (località e nome), distanza dall'utente, excerpt, galleria,
dettagli tecnici, "Dove", descrizione, box configurabili, badge dei tipi, form in sola lettura,
`info`, indicazioni stradali, Contatti, Link utili, link OSM, audio, HTML incorporato.

**Il confine con chi lo monta.** Nell'intestazione stanno località, nome e
`wm-related-pois-navigator`; il **pulsante di chiusura no**, resta al contenitore. La ragione è che
lì la semantica differisce davvero: nel pannello chiude il dettaglio, nel popup azzera anche
`ec_related_poi`. Tutto il resto dell'intestazione è identico nei due prodotti, quindi vive qui.

**Da dove vengono i dati che non arrivano già pronti dal backend:**

| Cosa si vede | Sorgente | Nota |
|---|---|---|
| Località sopra il nome | `taxonomyWheres`, ultimo elemento | array ordinato regione → provincia → comune |
| Indirizzo nei Contatti | `derivePoiAddress()` da `addr_complete`/`addr_locality`/`addr_street` | `address` non esiste nel payload |
| Telefoni | `splitPhones()` su `contact_phone` | il campo è una stringa CSV con etichette dentro |
| Link utili | `normalizeRelatedUrls()` su `related_url` | il campo arriva come oggetto, stringa o array |

**`wm-txn-where` non renderizza nulla** sulle app verificate: consuma `taxonomy_where`, che è vuoto
(0 POI su 3.252 dell'app 33, 0 su 3.721 dell'app 29), mentre il campo popolato è `taxonomyWheres`.
È un difetto noto, non corretto.

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
  resta comunque visibile nel corpo, come chip, tramite `wm-poi-types-badges`.

- **Posizionamento del pannello dentro il componente** (oc:8406): `poi-properties.component.scss`
  dichiara ancora `position: absolute; height: 100%; z-index: 2` sull'host. Non serve a nessuno dei
  due consumer — entrambi lo neutralizzano nel proprio foglio — ma è rimasto per non toccare il
  layout di entrambi i prodotti in un ciclo già ampio.
