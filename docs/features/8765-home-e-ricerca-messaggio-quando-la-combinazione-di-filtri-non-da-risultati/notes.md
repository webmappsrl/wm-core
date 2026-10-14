> Ticket: oc:8765

# Notes — Home e ricerca: messaggio quando la combinazione di filtri non dà risultati

## Divergenze dal piano, task per task

### Task 1: lancio dello spec

Il piano diceva che gli spec di `wm-core` non girano nella CI dell'app e andavano lanciati dall'app
con un `include` temporaneo in `core/tsconfig.spec.json`. È falso: la CI dell'app li lancia dalla
directory del submodule (`.github/workflows/test-unit.yml`, job dei test di wm-core:
`npx ng test wm-core --configuration=ci`), e `projects/wm-core/tsconfig.spec.json` include già
`**/*.spec.ts`. L'`include` temporaneo è stato tolto; lo spec si lancia da `wm-core` con
`npx ng test wm-core --watch=false --include=projects/wm-core/src/home/home-result`. Serve Node ≥ 20
(con Node 18 la CLI di Angular non parte).

### Task 4: aspetto dello stato vuoto

Dopo la prima verifica in app il dev ha chiesto un blocco più visibile. Sono state confrontate quattro
proposte grafiche (cerchio tenue, card, sentiero interrotto, lente sulla mappa) e il dev ha scelto la
**lente sulla mappa**: un SVG inline nel template al posto dell'`ion-icon` `search-outline`, perché
parla di ricerca e vale anche per il messaggio generico su tutti gli shard. Il sentiero interrotto era
più gradito ma non c'entrava con la ricerca.

Rispetto ai requisiti `[UX]` dell'overview, che restano com'erano:

- niente `ion-icon` né classe `wm-home-result-empty-icon`: le classi sono
  `wm-home-result-empty-illustration` e una per ogni parte dell'SVG (`-shadow`, `-map`, `-fold`,
  `-trail`, `-lens`, `-handle`, `-question`);
- testo in `--wm-color-primary`, 18px, peso 700, interlinea 1.35, larghezza massima 260px, al posto
  di `--wm-color-darkgrey` 16px peso medio: il rischio «contrasto accettato» dell'overview, scritto
  per il grigio, non vale più (vedi Follow-up);
- grigi dell'illustrazione da `--wm-color-darkgrey` a opacità ridotta, bianchi da
  `--wm-color-light`, lente con `color-mix` e un `fill` semplice di ripiego.

## Bug trovati

- **In review: `--wm-color-grey` non esiste nella webapp** e `--wm-color-white` non esiste in nessuno
  dei due prodotti. Con la prima versione dell'illustrazione, nella webapp mappa, pieghe, sentiero e
  ombra sarebbero spariti (dichiarazione invalida → `fill`/`stroke` a `none`). Corretto usando solo
  variabili definite in entrambi (`--wm-color-darkgrey`, `--wm-color-light`, `--wm-color-primary`).
- **In review: UGC aperte con filtri Home ancora attivi.** `openUgc` non azzera `routeFilters`, quindi
  sulla vista delle UGC sarebbe comparso «non ci sono cammini…». La funzione pura ora riceve
  `ugcOpened` e in quel caso non restituisce `filters`; c'è uno spec dedicato.
- Il dev server già avviato prima del cambio di branch ha mostrato errori di moduli mancanti
  (`map.page.ts`): webpack era rimasto a metà del checkout. Non era un difetto del codice; basta
  riavviarlo.

## Decisioni

- Testo del messaggio filtri copiato dal sito del cliente: «Spiacenti, non ci sono cammini inerenti
  alla ricerca». Nessun bottone «Scopri tutti i nostri cammini».
- Il messaggio filtri ha la precedenza sul generico; con lo stato `filters` la barra dei tab non viene
  resa (comparirebbe vuota).
- Lo stesso blocco vale per il messaggio generico, su tutti gli shard.
- Contenitore `role="status"` sempre presente, contenuto con `*ngIf`, perché una regione live creata
  già piena spesso non viene annunciata.
- I due testi stanno in `HOME_RESULT_EMPTY_MESSAGES`, accanto alla funzione pura, non nel template.
- Stima: 2h, decisa dal dev al posto della stima di 3.7h (non indipendente: `wm-estimate` non stima
  senza `plan.md`).
- Tag Orchestrator saltati su richiesta del dev.

## Follow-up

- La regola «filtri Home attivi senza layer aperto» vive in tre punti: `homeResultEmptyState`,
  `showResultTabSelected$` e gli `*ngIf` dei tab. Unificarla in una sola funzione pura che restituisca
  anche il tab selezionato e la visibilità della barra.
- Se servirà un altro stato vuoto (POI, UGC, download), estrarre l'illustrazione in un componente
  invece di copiarla.
- Testo nel colore primario: su uno shard con primario chiaro il contrasto può essere basso. Non
  verificato sui temi reali.
- Componente `Feature`: lo stile dello stato vuoto, stimato come scrittura pura, è diventato una
  decisione aperta (quattro proposte grafiche e una scelta del dev).
