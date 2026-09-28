> Ticket: oc:8613

# Note

Com'è andata in questo repo. Il **perché** del meccanismo sta in
[docs/knowledge/varianti-per-shard.md](../../knowledge/varianti-per-shard.md); le trappole in
[.claude/rules/css-per-istanza.md](../../../.claude/rules/css-per-istanza.md).

## Il riaggancio ha riacceso quattro regole che erano morte

È l'errore centrale del ciclo, trovato dalla review interna di fine lavoro e corretto.

Il tema dell'app 75 aveva selettori che non combaciavano più col markup dopo oc:8406, e sono stati
rinominati sui nomi nuovi. Ma **due rinomine su tre non erano rinomine**: il nome vecchio non
agganciava niente nemmeno prima, quindi riscriverlo non ha ripristinato una resa, l'ha **creata**.

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
