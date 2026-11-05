> Ticket: oc:8933

# sito - errore su filtro cartelli di segnaletica

## Cosa cambia

Quando sono attivi solo filtri per tipologia di POI, la home apre il tab POI e mostra i POI
filtrati, non più la lista dei sentieri. Il tab mostrato in `wm-home-result` segue la stessa
condizione che decide quali pulsanti sono visibili: il tab Tracks si sceglie solo quando il suo
pulsante è visibile (`showTracks`).

Se il filtro POI è attivo ma non c'è nessun POI da mostrare, per esempio una ricerca testuale che
trova solo sentieri, compare il messaggio vuoto che esiste già («Spiacenti non ci sono risultati
con questi criteri di ricerca.»). Oggi in questo caso si vedono i sentieri; senza questa modifica
si vedrebbe un pannello bianco.

La scelta del tab esce dal costruttore del componente e diventa una funzione pura,
`homeResultTab(...)`, accanto a `homeResultEmptyState`, con il suo spec. La funzione restituisce
anche se il pulsante Tracks è visibile, e il template usa quel valore: la regola «pulsante
visibile» sta in un posto solo.

Quando c'è un messaggio vuoto, la barra dei tab non si mostra. Il messaggio del caso «filtro POI
senza POI» aspetta che i POI abbiano finito di caricare, come già succede per le tracce.

## Perché

Lo segnala CAI Parma: attivato il filtro «cartelli di segnaletica», nel box di sinistra compaiono
i sentieri. La causa è in `showResultTabSelected$` (`home-result.component.ts`). Con soli filtri
POI il template nasconde il pulsante Tracks, perché `showTracks` vale `false`. Il calcolo del tab
però non legge `showTracks`: se nessun tab è stato cliccato, restituisce `'tracks'` appena ci sono
sentieri. Si vede quindi il solo pulsante «POI N», ma il segment vale `tracks` e sotto c'è la
lista dei sentieri.

La regola che preferiva i POI dopo un filtro POI (`lastFilterType`) è stata tolta dal refactor
oc:5634, che ha lasciato `lastFilterType$` nel `combineLatest` senza che nessuna riga lo usi.

Nello scrum del 05/11 Alessandro e Rubens hanno deciso di correggere tutti i punti da cui si
attiva il filtro. È stata scelta la regola su `showTracks` al posto di impostare il tab nel
reducer, perché copre in un solo punto anche la card della home e la ricerca testuale, e quando il
filtro si toglie il tab torna sulle track da solo.

## Requisiti

- [x] Con soli filtri POI attivati dal pannello Filtri della mappa, la home apre il tab POI.
- [x] Lo stesso vale toccando la card `poi_type_filter` della home (es. «Punti di interesse»
      sull'app 45) e aprendo un URL con `?filter=<idx>`.
- [x] Con un filtro POI attivo, una ricerca testuale mostra i POI (o i cammini, se la ricerca ne
      trova), mai i sentieri.
- [x] Togliendo l'ultimo filtro POI, o azzerando i filtri, il tab torna al comportamento di
      default (layers, poi tracks, poi pois).
- [x] Con filtri misti, track e POI insieme, il comportamento resta quello di oggi: entrambi i tab
      sono visibili, il default è Tracks.
- [x] Restano invariati: i filtri Home oc:8414, che prevalgono sulla scelta del tab; il layer
      aperto; le UGC aperte; il tab cliccato dall'utente quando il suo pulsante è visibile.
- [x] Con un filtro POI attivo e nessun POI da mostrare compare il messaggio vuoto generico, non
      un pannello bianco e non i sentieri.
- [x] Quando compare un messaggio vuoto la barra dei tab è nascosta: mai una barra senza pulsanti.
- [x] Il messaggio del caso «filtro POI senza POI» compare solo quando il caricamento dei POI è
      finito, con successo o con errore (nuovo indicatore `ecPoisLoaded` in `ec.reducer`): niente
      messaggio falso mentre i POI arrivano.
- [x] La visibilità del pulsante Tracks nel template viene dalla stessa funzione che sceglie il
      tab.
- [x] La scelta del tab è una funzione pura `homeResultTab(...)` con uno spec che copre tutti i
      casi qui sopra; lo spec di `homeResultEmptyState` copre il nuovo caso.
- [x] `lastFilterType$` e il suo import escono da `home-result.component.ts`.
- [x] [UX] Il tab selezionato corrisponde sempre a un pulsante visibile nella barra: mai un
      pulsante nascosto ma attivo.
- [x] [UX] Nessun pannello bianco: se non c'è nulla da mostrare, l'utente legge un messaggio.
- [x] Nessun testo nuovo: il messaggio vuoto esiste già ed è tradotto nei file `i18n/`.

## Rischi

- **Il tab cliccato dall'utente perde valore quando il suo pulsante sparisce.** Se l'utente ha
  scelto Tracks e poi attiva un filtro solo POI, la home passa a POI. È voluto, perché il pulsante
  Tracks in quel momento non c'è; quando il filtro si toglie, la scelta Tracks, che è ancora nello
  store, torna valida.
- **Barra dei tab senza pulsanti** (dalla challenge): con filtro POI e una ricerca che trova solo
  sentieri, `countAll > 0` mostrerebbe la barra senza pulsanti sopra il messaggio vuoto. Mitigato
  nascondendo la barra quando `emptyState$` non è `null`.
- **Messaggio vuoto falso durante il caricamento** (dalla challenge): i POI arrivano in modo
  asincrono e nello store non c'era un indicatore di caricamento. Mitigato con `ecPoisLoaded`.
- **La regola «pulsante visibile» era duplicata** tra funzione del tab, `*ngIf` del pulsante
  Tracks e stato vuoto (dalla challenge). Mitigato facendo restituire alla funzione pura anche la
  visibilità del pulsante Tracks, letta dal template.
- **Il fix è in `wm-core` e arriva anche all'app.** `webmapp-app` usa `wm-home-result` in
  `map.page.html` senza varianti né `fileReplacements`, quindi il comportamento è identico.
- [UX] Con soli filtri POI la barra dei tab mostra un solo pulsante (POI), come già oggi: è
  coerente con i risultati e non serve cambiarla.

## Out of scope

- Rimuovere `lastFilterType` dallo store (azione, reducer, selettore, `lastFilterTypeEvt` di
  `filters.component` e `slider-filter`, invio da `geobox-map`): non lo legge più nessuno, ma la
  pulizia tocca codice estraneo al bug. Va in un ticket a parte.
- Test E2E Cypress del caso: la copertura è lo spec della funzione pura più la prova nel browser.
- Filtro POI con un layer aperto: dentro un layer i sentieri restano il default
  (`showTracks` è vero con un layer aperto e aprire un layer imposta il tab Tracks). Entrambi i
  pulsanti sono visibili, quindi il caso non ha il difetto di questo ticket; far prevalere il
  filtro POI sul layer è una scelta di prodotto.

## Moduli toccati

Tutto in `wm-core`:

- `projects/wm-core/src/home/home-result/home-result-tab.ts` — nuovo: funzione pura
  `homeResultTab(...)`.
- `projects/wm-core/src/home/home-result/home-result-tab.spec.ts` — nuovo: spec della funzione.
- `projects/wm-core/src/home/home-result/home-result.component.ts` — `showResultTabSelected$`
  usa `homeResultTab` con `showTracks$` al posto di `lastFilterType$`; `emptyState$` riceve le
  track mostrabili e lo stato di caricamento dei POI.
- `projects/wm-core/src/home/home-result/home-result.component.html` — pulsante Tracks e barra dei
  tab letti dai valori calcolati.
- `projects/wm-core/src/store/features/ec/ec.reducer.ts` e `ec.selector.ts` — indicatore
  `ecPoisLoaded`.
- `projects/wm-core/src/home/home-result/home-result-empty-state.ts` e il suo spec — nuovo caso
  «filtro POI senza POI».
- `docs/knowledge/home-ricerca-e-tab.md` — regola del tab aggiornata.

In `wm-webapp` e `webmapp-app` cambia solo il puntatore al submodule, che non entra nei commit di
questo lavoro.
