> Ticket: oc:8406

# Notes — Unificare i componenti di dettaglio EcPoi (wm-core)

## Deviazioni dal piano

- **Firma store-only invece di store-first + `@Input` di override.** La proposta
  iniziale prevedeva un `@Input` opzionale che scavalcasse il selector, nata
  dall'ipotesi che wm-webapp usasse una sorgente dati diversa. L'ipotesi era falsa:
  `wm-webapp/src/app/pages/map/map.page.html:54-60` binda `poi$ = this._store.select(poi)`,
  quindi entrambe le piattaforme leggono già dallo store. Quello che il popup web fa in
  più non è cambiare sorgente, è **normalizzare** l'indirizzo. Un `@Input` avrebbe
  lasciato due percorsi dati dentro il componente il cui scopo è eliminare la
  duplicazione, spostando il debito di un livello invece di chiuderlo. Proposta
  ritirata prima di scrivere codice.

- **`omitAddress()` invece di modificare `wm-tab-detail`.** Per togliere l'indirizzo dal
  blocco tecnico senza toccare un componente condiviso da `track-properties` e
  `draw-ugc`, il componente spoglia `address` dalle properties che passa a
  `wm-tab-detail`. `wm-tab-detail` resta bit-identico, quindi EcTrack e disegno UGC
  hanno rischio di regressione **zero** anziché mitigato.

- **Indirizzo nei Contatti, non nei Dettagli tecnici — decisione ribaltata dopo la
  challenge.** La challenge adversariale (eseguita in una sessione parallela, vedi
  sotto) si era chiusa su "address resta nei tecnici, gate `ele || address`". Il QA
  manuale ha ribaltato: l'indirizzo è un'informazione di **contatto**, sta con telefono
  ed email, e il gate dei tecnici dipende ora dalla sola `ele`. Chi rileggesse il recap
  della challenge lo troverebbe in contraddizione col codice: la contraddizione è
  voluta e questa riga ne è la ragione.

- **Split "Contatti" / "Link utili" (solo EcPoi).** Emerso in QA: raggruppare indirizzo,
  telefono ed email sotto l'etichetta "Link utili" era semanticamente sbagliato. Sono
  diventati due gruppi — Contatti (address → phone → email) e Link utili (solo
  `related_url`) — con OSM lasciato fuori e invariato. EcTrack e UGC non sono toccati:
  non hanno phone/email/address nel pannello.

- **Fix del telefono multiplo tirato dentro questo ticket.** Raccomandazione iniziale:
  ticket separato, perché il bug esiste indipendentemente dal refactor e `wm-phone` è
  usato anche da `track-properties`. Il dev ha deciso di ripararlo qui. Mitigazione
  concordata: commit isolato, così la PR resta bisezionabile.

## Bug trovati

- **`wm-phone` produce un `tel:` invalido con più numeri.** `@Input() phone: string` finiva
  intero dentro `href="tel:{{phone}}"`: con `"+39 050 1234, +39 333 5678"` il link
  conteneva entrambi i numeri e la virgola. **Non è un caso limite: 1.798 POI su 8.613
  con telefono contengono una virgola (20,9%)**, misurato su `db_prod`. Risolto con
  `split-phones.ts` (split, trim, scarto dei vuoti) e normalizzazione del `tel:`.

- **La riga "Indirizzo" di `wm-tab-detail:155` era codice morto.** `properties.address` non
  è mai stato popolato da nessuno: non è dichiarato in `wm-types`, nessuno lo scrive in
  wm-core/map-core/webmapp-app, e il backend espone `addr_complete`/`addr_street`/
  `addr_locality` (verificato su `ec_pois` e sulla fixture `map-core/src/const.spec.ts`).
  L'unico posto che lo componeva era il popup di wm-webapp, cioè il file che questo
  ticket rende obsoleto. Senza la derivazione, adottare il componente condiviso avrebbe
  fatto **perdere l'indirizzo al web** invece di darlo a mobile.

- **Le etichette del backend finivano a schermo.** `contact_phone` contiene valori come
  `"Fixed Phone:+39 0341 481111,Cell Phone:,Other Phone:"` (POI 97598, Comune di Lecco):
  la UI mostrava tre righe telefono, due delle quali con la sola etichetta e nessun
  numero. **1.647 POI su 1.798 con virgola (92%) sono di questa forma** — cioè quello
  che sembrava "supporto ai telefoni multipli" è in larga parte pulizia di sporcizia del
  dato. `splitPhones` ora rimuove le etichette generiche (`Fixed/Cell/Mobile/Other
  Phone`, `Tel`, `Telefono`, `Fax`) e scarta le voci prive di cifre. Due eccezioni
  deliberate: le etichette che portano informazione (`Rifugio:`, `Mairie :`, nomi di
  referenti — 28 voci) restano, e non viene mai tagliato un prefisso che contiene già
  cifre, perché su valori come `0124 442455; Paolo: 347 1932853` il testo prima dei due
  punti **è** un numero.

- **Stesso difetto sugli indirizzi.** `addr_complete` vale `",,"` su **82 POI** e ha
  virgole ai bordi su **522** (es. `",37013 Caprino Veronese VR,"`). `derivePoiAddress`
  li accettava perché diversi da stringa vuota, quindi la riga indirizzo mostrava
  separatori nudi. Ora i segmenti vuoti vengono scartati e, se non resta nulla, si passa
  al fallback `locality`/`street` invece di rendere una riga spazzatura.

- **`wm-email` ha lo stesso difetto di `wm-phone`** (stringa intera dentro `mailto:`).
  Non risolto: **5 record** con virgola in produzione contro 1.798 del telefono. Il
  rapporto rischio/beneficio non giustifica di toccare un secondo componente condiviso
  in questa PR. Vedi Follow-up.

## Decisioni

- **Derivazione in una util pura (`derivePoiAddress`), non nello store.** Metterla nel
  selector `currentPoiProperties` avrebbe cambiato la forma delle properties per *tutti*
  i consumer, anche quelli che dell'indirizzo non sanno nulla. La util è chiamata dal
  componente, con spec propria.

- **`address` e `address_link` sono due campi distinti, non lo stesso valore formattato
  due volte**: il primo unisce con `, ` (leggibile), il secondo con `+` (URL-safe per il
  link Maps). Promuoverne uno solo avrebbe rotto il link.

- **Niente fallback su `taxonomy.poi_type` singolare**, che il popup web legge e mobile
  no. Il backend lo espone marcandolo esplicitamente `// deprecated`
  (`geohub/app/Models/EcPoi.php:304`) accanto a `poi_types`. Portarlo avrebbe
  significato adottare un campo in dismissione: in fase C è semmai il web a doverlo
  smettere di leggere.

- **`wm-related-urls` non riscritto in questo ciclo, ma il problema è reale — misura
  iniziale sbagliata, corretta in corsa.** Il componente usa `window.open()` invece di un
  anchor (niente middle-click, niente "copia indirizzo", bloccabile dai popup blocker) e
  soprattutto fa `url.replace(/^https?:\/\//, '')` per poi riprefissare `https://`.
  Una prima misura aveva concluso "0 URL `http://` in produzione, rischio teorico": era
  **falsa**, perché la query cercava `%http://%` mentre nel database le barre sono
  escapate (`http:\/\/`). **Misura corretta: 1.013 POI su 12.644 con `related_url`
  (8%) hanno almeno un URL in `http://` puro** — comuni, pro loco, siti turistici
  locali. Su tutti questi il link viene forzato a https e si rompe se il sito non lo
  supporta. Il nuovo `wm-address` usa già il pattern corretto (`href` reale +
  `rel="noopener noreferrer"`), ma `wm-related-urls` resta da sistemare: è condiviso con
  `track-properties`, quindi la modifica va valutata a parte. **Non è un rischio
  teorico: è un bug attivo su 1.013 POI.**

- **Nessun flag `OPTIONS.*` di rollout**, coerentemente con oc:8458 e diversamente da
  oc:8176/8177/8183. Il rollback è il revert dei commit più il ripristino del pin.

- **Branch aperto da `RDO_ass_cammini_italia_2026_2`, non da `develop`.** In wm-core RDO è
  avanti di 10 commit su develop (in webmapp-app di 36) e `develop` è suo antenato
  stretto. Finché RDO non rientra in develop, il componente unificato resta disponibile
  al solo shard cammini d'Italia. **Debito consapevole**: il dev ha deciso di gestire
  l'integrazione a valle. Il ticket si chiude mentre per gli altri cinque shard la
  duplicazione resta in piedi.

- **Challenge adversariale eseguita in una sessione parallela, non in questa.** Il
  tentativo in questa sessione è terminato per rate limit prima di produrre output e non
  è stato rilanciato. Gli assi coperti altrove: gate `showUsefulUrls$`, derivazione nello
  store, precedenza `address` backend vs `addr_*`, blast radius di `wm-phone`, assenza di
  kill switch. Le sue conclusioni sono confluite qui tranne quella sulla collocazione
  dell'indirizzo, ribaltata in QA (vedi Deviazioni).

## Risolti in corsa dopo la prima stesura di queste note

- **`omitAddress()` era chiamato nel template binding**, quindi restituiva un oggetto
  nuovo a ogni change detection e `wm-tab-detail` (OnPush) si ri-renderizzava a ogni
  ciclo. Sostituito da `technicalProperties$`, derivato una volta per emissione con
  `shareReplay`. Il primo spec scritto per coprirlo **è fallito**, e aveva ragione: la
  derivazione non era condivisa tra subscriber. Invece di indebolire il test è stato
  aggiunto `shareReplay` anche lì, così la garanzia è reale e non solo implicita nel
  fatto che oggi esiste un solo binding.
- **`mapsHref` non faceva `encodeURIComponent`** sulla destinazione. Nessun indirizzo in
  produzione contiene oggi `&`, `#` o `?`, ma il costo era una riga e la stessa logica
  sta per essere copiata nella webapp in fase C.

## Follow-up

- **`wm-related-urls`**: rimuovere il `replace`/riprefisso `https` e passare a un anchor.
  Bug attivo su 1.013 POI (vedi Decisioni). Componente condiviso con `track-properties`,
  quindi va deciso se dentro questo ticket o a parte.
- **`wm-email` multiplo** (5 record): ticket separato se il backend inizierà a mandarne
  di più.
- **Valori spazzatura in `contact_phone`** tipo `"Cell Phone:"` / `"Other Phone:"`, visti
  in QA. `split-phones` scarta i vuoti ma non le etichette senza numero. Fuori scope:
  è pulizia del dato lato backend, non del componente.
- **Fase C (wm-webapp)**: sostituzione del corpo di `poi-popup`, split EcPoi/UGC,
  adozione di `wm-related-pois-navigator` (che ripara la navigazione related, oggi morta
  sul web: `map.page.ts:65,81` hanno corpi vuoti). Preservare `startDrawUgcPoi` /
  `stopDrawUgcPoi`, che `wm-ugc-poi-properties` non implementa: senza, sul web non si
  riposiziona più un POI UGC.
