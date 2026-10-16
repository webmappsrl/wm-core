> Ticket: oc:8765

# Home e ricerca: messaggio quando la combinazione di filtri non dà risultati

## Cosa cambia

Su camminiditalia, quando i filtri della home (regione, difficoltà, durata… — `routeFilters`,
oc:8414) non corrispondono a nessun cammino, `wm-home-result` oggi mostra un pannello bianco.
Dopo questa feature mostra il messaggio «Spiacenti, non ci sono cammini inerenti alla ricerca»,
lo stesso testo del sito WordPress del cliente.

Il messaggio generico già esistente — «Spiacenti non ci sono risultati con questi criteri di
ricerca.», che compare su tutti gli shard quando tracce, POI e cammini sono tutti a zero —
prende lo stesso aspetto grafico del nuovo: un unico blocco di stato vuoto, curato e coerente
col resto dell'app, in cui cambia solo il testo. Ne compare al massimo uno per volta.

## Perché

Un utente ha segnalato come bug il pannello vuoto: senza un messaggio non si capisce se l'app
sta caricando, se si è rotta o se semplicemente non c'è nulla. Il cliente lo ha chiesto nella
call del 12/10/2026 (Giuseppe: «se là dove non ci sono risultati scriviamo questa combinazione
non porta risultati, così è più user friendly piuttosto che non visualizzare nulla»), prendendo
a modello il proprio sito.

La causa nel codice: con filtri Home attivi e nessun cammino corrispondente,
`showResultTabSelected$` restituisce `null` (`home-result.component.ts:167`) e il contenitore
del contenuto non rende nulla (`home-result.component.html:73`); il messaggio generico non
scatta perché guarda `countAll` (tracce + POI, che i filtri Home non toccano), non i cammini
(`home-result.component.html:135`).

## Requisiti

- [ ] Con filtri Home attivi (`hasActiveRouteFilters`), nessun layer aperto e zero cammini
  corrispondenti (`countLayers == 0`), `wm-home-result` mostra «Spiacenti, non ci sono cammini
  inerenti alla ricerca».
- [ ] Senza quel caso, se tracce, POI e cammini sono tutti a zero e le tracce non sono in
  caricamento, mostra il messaggio generico «Spiacenti non ci sono risultati con questi criteri
  di ricerca.» (comportamento attuale, più la condizione sul loading).
- [ ] Mai entrambi i messaggi insieme: il caso filtri ha la precedenza.
- [ ] Nessun bottone né azione: solo il messaggio.
- [ ] Quando lo stato è `filters`, la barra dei tab (`ion-segment`) non viene resa: oggi
  comparirebbe vuota sopra il messaggio, perché `countAll > 0` ma tutti i tab sono nascosti
  (`home-result.component.html:25,30,43,60`).
- [ ] La scelta del messaggio sta in una funzione pura (`'filters' | 'generic' | null`) coperta
  da uno spec unitario: filtri + zero cammini → `filters`; filtri + layer aperto → non `filters`;
  tutto a zero senza filtri → `generic`; tutto a zero in caricamento → `null`; con risultati →
  `null`. Lo stesso valore decide anche la barra dei tab, così la scelta resta in un punto solo.
- [ ] Chiave i18n nuova, testo italiano come chiave, in tutti e 7 i file di
  `localization/i18n/` (de, en, es, fr, it, pr, sq).
- [ ] [UX] Un unico blocco di stato vuoto per entrambi i messaggi: icona Ionic outline
  (`search-outline`) sopra il testo, entrambi centrati, con margine verticale di 32px (compatto
  anche nel pannello della mappa) e larghezza del testo contenuta per evitare righe troppo lunghe su tablet/web.
- [ ] [UX] Colori solo da variabili del tema (`--wm-color-darkgrey` per il testo, icona più
  tenue, per esempio `--wm-color-medium`): niente rosso né colori di errore — è
  un'informazione, non un errore. Nessun hex nel componente.
- [ ] [UX] Testo a dimensione di corpo leggibile (≥16px), interlinea ~1.4, peso medio; non un
  titolo `h5` allineato a sinistra come oggi.
- [ ] [UX] Accessibilità: un contenitore `role="status"` sempre presente nel template, vuoto
  quando non serve; dentro cambia con `*ngIf` solo il contenuto (icona + testo), perché una
  regione live creata già piena spesso non viene annunciata. Icona `aria-hidden="true"`.
- [ ] [UX] Classi con prefisso `wm-` (`wm-home-result-empty`, `-icon`, `-text`), stile nello SCSS
  condiviso di `home-result`.

## Rischi

- **Cambio visivo su tutti gli shard.** Il messaggio generico cambia aspetto anche per i clienti
  che non hanno chiesto nulla. Mitigazione: modifica contenuta (centrato + icona, colori del
  tema), verifica a mano su camminiditalia e su almeno un altro shard prima del merge.
- **Due punti di montaggio.** `wm-home-result` è montato anche nel pannello di dettaglio della
  mappa (nell'app, `core/src/app/pages/map/map.page.html:46`), la cui altezza segue il contenuto
  (`ResizeObserver`, oc:8313): il blocco ne cambia l'altezza. Mitigazione: margini compatti
  (32px) e verifica a mano in home **e** sulla mappa; nessuna variante di stile per la mappa a
  priori.
- **Contrasto del testo sotto soglia, accettato.** `--wm-color-darkgrey` (`#989898`) su bianco dà
  circa 2.9:1, sotto il 4.5:1 WCAG AA. Scelta del dev per coerenza con il resto dell'app; si
  rivede se in collaudo il testo risulta poco leggibile all'aperto.
- **Messaggio che lampeggia durante il caricamento.** Oggi il generico può comparire mentre le
  tracce stanno ancora arrivando. Mitigazione: la condizione del generico esclude
  `ecTracksLoading`; il caso filtri dipende solo dalla configurazione (`confHOMELayers`), già
  disponibile.
- **Stato vuoto silenzioso.** `countLayers$` passa da un `debounceTime(300)`: per 300ms dopo un
  cambio filtri il messaggio può restare quello precedente. Accettabile, è lo stesso ritardo
  della lista dei cammini.
- [UX] **Nessuna via d'uscita esplicita.** Senza bottone l'utente deve capire da sé che deve
  cambiare i filtri dalla searchbar. Accettato dal dev; se dal collaudo emergesse confusione, il
  reset esiste già (`routeFiltersChanged({filters: {}})`).
- [UX] **Testo lungo in tedesco/albanese.** Le traduzioni possono andare su più righe: il testo
  centrato con larghezza massima le gestisce senza tagliarle.

## Out of scope

- Un bottone «Scopri tutti i nostri cammini» che azzera i filtri.
- Uno stile specifico camminiditalia nel foglio per app.
- Stati vuoti nei tab POI o UGC aperti, e nella lista dei download.
- Test E2E Cypress.

## Moduli toccati

Tutto in **wm-core** (`projects/wm-core/src/`):

- `home/home-result/home-result.component.html` — blocco di stato vuoto unico al posto
  dell'`ion-item` attuale
- `home/home-result/home-result.component.ts` — observable `emptyState$`
- `home/home-result/home-result.component.scss` — stile del blocco
- `home/home-result/home-result-empty-state.ts` (nuovo) — funzione pura di scelta del messaggio
- `home/home-result/home-result-empty-state.spec.ts` (nuovo) — spec
- `localization/i18n/{de,en,es,fr,it,pr,sq}.ts` — chiave nuova

In **webmapp-app**: solo l'aggiornamento del puntatore del submodule `wm-core`.
