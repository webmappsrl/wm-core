---
paths:
  - "projects/wm-core/src/assets/theme/**"
  - "projects/wm-core/src/poi-properties/**"
  - "projects/wm-core/src/track-properties/**"
  - "projects/wm-core/src/**/*.html"
  - "projects/wm-core/src/**/*.scss"
---

# Trappole: i CSS per istanza vivono qui

Il perché sta in [docs/knowledge/varianti-per-shard.md](../../docs/knowledge/varianti-per-shard.md),
e l'inventario nel [README accanto ai file](../../projects/wm-core/src/assets/theme/README.md).

Nove fogli di CSS **dei clienti** stanno in `projects/wm-core/src/assets/theme/<shard>/<appId>.css`
e sono serviti da **entrambi** i prodotti. Puntano ai nostri selettori per nome, e nessuna build li
referenzia: il `<link>` lo costruisce `meta/meta.component.ts:50` a runtime.

## Rinominare

- **Una rinomina qui dentro scollega il CSS di un cliente, in silenzio.** Nessun compilatore, test
  o lint segnala il drift. Dopo aver rinominato un selettore, una classe o una variabile CSS, cerca
  il vecchio nome nella cartella dei temi.

- **Prima di riagganciare una regola scollegata, chiediti se il nome vecchio agganciava.** Se non
  agganciava, non stai rinominando: stai scrivendo una regola nuova, e la somiglianza con quella di
  prima la traveste da manutenzione. È successo due volte su tre nello stesso ciclo (oc:8613):
  `wm-excerpt` e `wm-tab-audio` erano nomi di elementi che non sono mai esistiti, e «ripristinarli»
  ha spostato blocchi sulla scheda di un cliente. Il tipo di selettore non è l'indizio —
  `wm-tab-audio` → `wm-track-audio` resta elemento→elemento.

- **Se il componente col nome vecchio è ancora vivo altrove, affianca invece di sostituire.**
  `wm-feature-useful-urls` non era più nel dettaglio POI ma lo è ancora in `ugc-track-properties` e
  `draw-ugc`: sostituirlo toglieva lo stile lì invece di spostarlo.

## Misurare

- **La baseline è la produzione, non il codice.** Davanti a un dubbio si apre l'istanza vera —
  `75.mobile.webmapp.it` per Ville — e si misura lì. Nello stesso ciclo tre sospetti nati leggendo
  il diff si sono sciolti così, ed erano tutti difetti precedenti al ticket.

- **Contare i bersagli non dice se la dichiarazione vince.** Oltre a «aggancia» e «non aggancia»
  c'è *aggancia e perde*: il `margin-top: 15px` del tema 33 ha un bersaglio e non si vede dal 2025,
  perché uno shorthand `margin` di pari specificità è iniettato dopo. Confronta il valore dichiarato
  con `getComputedStyle` sulla proprietà dichiarata — e per un valore relativo (percentuali, `em`)
  verifica **su cosa** si risolve, o ti inventi un difetto.

- **`querySelectorAll` non aggancia mai uno pseudo-elemento.** `('body::after')` dà 0 anche se
  `body` esiste: misura sull'host. Le pseudo-**classi** invece funzionano.

- **Anche uno screenshot mente, se l'ambiente non è quello reale.** Su un pannello animato e
  dipendente dalla larghezza della finestra, due sessioni hanno misurato lo stesso stato ottenendo
  numeri diversi fra loro, e il difetto che entrambe vedevano non esisteva su un telefono. Quando
  due strumenti indipendenti divergono, nessuno dei due sta misurando ciò che crede.

## Toccare un componente reso nel dettaglio

- **Un figlio flex senza `order` vale 0, quindi va in cima.** `wm-track-properties` è
  `display: flex; flex-direction: column`, e i temi di FIE (29), CAI Parma (33) e Ville (75) ne
  numerano le sezioni. Aggiungere un figlio senza `order` lo mette **sopra l'intestazione**. Lo slot
  `[bottom]` ha un `order: 100` per questo.

- **Spostare uno spazio dal `padding` al `margin` non è neutro ovunque.** Il tema di Ville azzera
  `--wm-feature-details-margin`, perché lì la spaziatura la dà il padding di ogni blocco: dove il
  margine è azzerato, lo spazio spostato lì sparisce e basta.

- **Una modifica qui arriva a entrambi i prodotti, che hanno contenitori diversi.** La stessa
  dichiarazione può vincere da una parte e perdere dall'altra: `wm-map-details` è un elemento,
  `.details-container` una classe, quindi il ramo webapp ha una specificità in più. L'esito va
  **misurato su entrambi**, non dedotto dal fatto che la regola è la stessa.
