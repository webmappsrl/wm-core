> Ticket: oc:8613

# Note

Com'è andata in questo repo. Il **perché** del meccanismo sta in
[docs/knowledge/varianti-per-shard.md](../../knowledge/varianti-per-shard.md); le trappole in
[.claude/rules/css-per-istanza.md](../../../.claude/rules/css-per-istanza.md).

## Il riaggancio ha riacceso cinque regole che erano morte

È l'errore centrale del ciclo, trovato dalla review interna di fine lavoro e corretto.

Il tema dell'app 75 aveva selettori che non combaciavano più col markup dopo oc:8406, e sono stati
rinominati sui nomi nuovi. Ma **due rinomine su tre non erano rinomine**: il nome vecchio non
agganciava niente nemmeno prima, quindi riscriverlo non ha ripristinato una resa, l'ha **creata**.

> Attenzione all'unità di misura, perché due lettori diversi ci sono già inciampati: le **rinomine**
> sono tre e due sono state annullate, ma i **punti del file** riportati indietro sono tre — 258,
> 684 e 699 — perché `wm-tab-audio` compare due volte. Il titolo qui sopra conta invece le
> **regole** riaccese, cinque, contando anche le due dell'intestazione.

| Regola | Nome vecchio | Esito |
|---|---|---|
| `wm-excerpt` → `.wm-excerpt` | elemento inesistente | l'`order: 7` si è acceso e ha portato l'excerpt sopra «Informazioni»; in produzione sta in fondo |
| `wm-tab-audio` → `wm-track-audio` | mai esistito in nessuno dei due prodotti | due `order` accesi, sul dettaglio POI e su quello traccia |
| `wm-feature-useful-urls` → `.wm-poi-properties-contacts` | **agganciava** | rinomina vera — ma il componente è ancora vivo altrove, quindi affiancata e non sostituita |

Lo stesso è successo a due regole dell'intestazione, tradotte sui nuovi `.wm-poi-properties-*`:
erano inerti **anche in produzione**, perché là l'intestazione sta in
`webmapp-map-page .webmapp-info-header-container`, non dentro `wm-map-details ion-card
ion-card-header`. Annullate.

**Il criterio giusto non è quello che ci eravamo dati.** All'inizio era «attenzione quando cambia il
*tipo* di selettore, da elemento a classe» — ma `wm-tab-audio` → `wm-track-audio` resta
elemento→elemento ed è un'attivazione lo stesso. La domanda è una sola:

> il nome **vecchio** agganciava qualcosa?

Se no, non stai rinominando: stai scrivendo una regola nuova, e la somiglianza con quella di prima
la traveste da manutenzione.

## Come l'abbiamo scoperto, che conta più del cosa

Ogni volta il sospetto è nato **leggendo il diff** e si è sciolto **guardando la produzione**. Tre
casi su tre erano difetti precedenti al ticket, non regressioni: le regole dell'intestazione erano
morte da prima, un `margin-top: 15px` del tema 33 era perso dal febbraio 2025 per uno shorthand
`margin` aggiunto da oc:4837, e l'altezza del pannello collassato dell'app è del gennaio 2025.

`75.mobile.webmapp.it` è la baseline: davanti a un dubbio su un tema, si apre quella e si misura.

## Le misure automatiche mentono più di quanto sembri

Tre modi diversi, tutti incontrati qui:

- **`querySelectorAll` non aggancia uno pseudo-elemento**: quattordici regole del tema 75 sembravano
  morte, dodici erano vive.
- **Contare i bersagli non dice se la dichiarazione vince.** Esiste una terza categoria oltre a
  «aggancia» e «non aggancia»: *aggancia e perde*. Il `margin-top: 15px` del tema 33 ha un bersaglio
  e non si vede da quattordici mesi.
- **Anche uno screenshot mente, se l'ambiente non è quello reale.** Sul pannello dell'app due
  sessioni hanno misurato lo stesso stato ottenendo `320/234` e `227/157`, e il difetto che
  entrambe vedevano non esiste su un telefono. Due strumenti indipendenti che divergono fra loro
  non stanno misurando la cosa che credono.

## Correzioni di fine ciclo, dalla review interna

- **`telHref`** concatenava i numeri di una voce che ne contiene due — `tel:01244424553471932853`
  su un valore reale, pinnato negli spec. Ora prende il primo.
- **`buildMapsHref`** estratta: `mapsHref` era un getter del componente, quindi `wm-webapp` ne
  teneva una copia a mano nel ramo UGC, senza spec.
- **Il contratto di `isShowingRelatedPoi`** — confronto per riferimento — non era protetto da
  nessuno spec: quelli esistenti passavano lo stesso oggetto due volte alla `projector`. Tre spec
  nuovi falliscono il giorno in cui qualcuno aggiunge uno spread a `currentPoiProperties`.
- **Due dati sbagliati** nella pagina canonica: «nove file per otto app» (le app sono sei) e la
  riga di Cammini d'Italia data per «tutta sulla home».

## Secondo ciclo di review, stesso giorno

Una review indipendente sugli stessi range ha trovato **tre bloccanti** che il primo ciclo non
aveva visto, tutti corretti qui.

- **Un `related_url` senza schema diventava un link relativo.** `[href]` riceveva il valore dopo il
  solo `trim()`: `www.prolocox.it` apriva `https://<host>/…/www.prolocox.it` sulla webapp e
  `capacitor://localhost/…` sull'app. Misurato sui POI delle app 75, 29 e 33: **235 URL su 1147**
  senza schema, il 20,5%. La prima correzione anteponeva `https://` solo dove mancava, lasciando
  `http://` com'era. **Il terzo giro di review l'ha però trovata insufficiente**: lasciava passare
  anche `javascript:` e `data:`, e `[href]` su `<ion-item>` è un input di componente, che Angular
  non sanitizza. Ora `safeHref()` ha una allowlist — `http`, `https`, `mailto`, `tel` — e scarta
  tutto il resto, riconoscendo `host:porta` per non buttare via link buoni. Nei dati c'era anche
  `https//host`, schema senza i due punti: viene riparato, non prefissato una seconda volta.
- **Due visori della galleria sulla build web della mobile.** La condizione era su `isAppMobile`,
  ma `mobileweb` non è l'app nativa: si apriva il modale oltre alla vista inline. La decisione
  passa al prodotto con `WM_IMAGE_DETAIL_PRESENTATION`, default `inline`.
- **La guardia sui temi non vedeva un pin rimasto indietro.** `ATTESI` stava in questo repo, cioè
  insieme ai file che controlla: un consumer pinnato indietro portava con sé entrambi e i due
  coincidevano. Ora l'elenco è un `theme-manifest.json` nella radice di build di ciascun prodotto —
  già la cwd di tutti i punti di innesto — **ventuno**, nove sulla webapp e dodici sulla mobile —
  quindi nessuno di loro ha dovuto cambiare *per lo spostamento dell'elenco*. Sono poi cambiati
  quasi tutti, ma per un'altra ragione e in un secondo momento: `40c3097` e `625a4e13` li hanno
  portati a invocare `npm run check-themes` invece del percorso, così quel percorso è scritto una
  volta per repo. **Undici su dodici**: il gulpfile è rimasto a `node <percorso>` e non può fare
  altrimenti, perché `npm run` porta la cwd alla radice del pacchetto e il gate guarderebbe la
  cartella sbagliata. L'affermazione regge quindi sulla **cwd**, non sul fatto che nessuno li abbia
  toccati; e la cwd del gulpfile non è `core/` ma `instances/<nome>`, che è una copia e contiene
  anch'essa il manifest.

E un difetto nella correzione del primo ciclo: **`telHref` perdeva il prefisso internazionale**
quando era separato dal numero da due spazi, `"+39  0341 481111"`. Il frammento `+39` ha tre cifre,
sotto la soglia, e veniva scartato con tutto il resto. Ora un frammento che è **solo** un prefisso
viene tenuto da parte e riattaccato al numero che segue.

## Aperto, di proposito

- **Una font unica condivisa.** L'alias `@font-face` fa risolvere il nome ma non allinea le mappe
  dei glifi: 241 codepoint in comune, **quattordici** su icone diverse. Oggi nessun tema li
  attraversa, ma l'alias ha cambiato il modo di sbagliare — prima mancava il glifo e si vedeva,
  adesso ne esce uno sbagliato e plausibile. Dettagli e tabella nel `README.md` dei temi.
- **I sei file di tema duplicati.** Un `@import` nei derivati è stato valutato e scartato: a un 404
  il cliente perderebbe tutto il CSS invece di una riga. Restano copie, ora dichiarate.
- **Tre figli di `wm-track-properties` senza `order`** — l'excerpt, `wm-txn-where`,
  `wm-config-detail` — che con un tema che numera le sezioni risalgono sopra l'intestazione. Non
  esiste un default giusto da inventare: la numerazione è del cliente.
