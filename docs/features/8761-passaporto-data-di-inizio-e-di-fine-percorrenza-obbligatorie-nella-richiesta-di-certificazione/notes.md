> Ticket: oc:8761

# Notes — date di percorrenza nella richiesta di certificazione (wm-core)

## Divergenze dal piano, task per task

### Task 2: date nel form, calendario, uscita protetta

Dopo averlo visto sul dispositivo, il dev ha chiesto un'interfaccia diversa per i campi e per il
calendario (14/10/2026):

- **Campi**: non più due bottoni arancioni a tutta larghezza, che sembravano azioni, ma un'etichetta
  «Periodo del cammino *» e due campi affiancati «Dal» / «Al», bordati in grigio, con l'icona del
  calendario e la data (o «Seleziona la data») a sinistra.
- **Calendario**: non più una modale centrata `fit-content`, ma un foglio che sale dal basso
  (sheet modal di Ionic ad altezza automatica, breakpoint `[0, 1]`), con sfondo scurito, maniglia,
  titolo del campo («Data di inizio» / «Data di fine»), ✕ per chiudere e un bottone arancione
  «Conferma» a tutta larghezza, come «Invia richiesta». Lo schema è quello delle app di
  prenotazione (Booking, Trenitalia).
- **Perché la versione centrata si vedeva male**: è la seconda modale aperta, sopra quella del
  passaporto, e Ionic azzera lo sfondo scuro delle modali impilate (`--backdrop-opacity: 0`); in più
  la modale `fit-content` non aveva né bordo né ombra. Il foglio imposta esplicitamente sfondo,
  angoli e ombra.
- **Cambia anche quando la data si applica.** Senza i bottoni di default di `ion-datetime`,
  `ionChange` parte a ogni tocco di un giorno: il tocco aggiorna solo `pendingDate`, e il campo
  si imposta con `confirmDate()` (bottone «Conferma»). ✕, trascinamento verso il basso, tocco
  sullo sfondo e `closeOverlay()` (tasto indietro) chiudono il foglio scartando la scelta. La
  regola «inizio oltre la fine → la fine si svuota» sta in `confirmDate()`, non più in
  `onDatePicked()`. Membri nuovi rispetto all'Interfaccia del piano: `pendingDate`,
  `confirmDate()`, `calendarField` (tiene titolo, `min` e valore del calendario fermi durante
  l'animazione di chiusura, quando `editing` è già `null`), `calendarValue`, `startDateInvalid`,
  `endDateInvalid`. `cancelText`/`doneText` non si usano più.
- **Chiavi i18n in più rispetto alla tabella del Task 5**: «Periodo del cammino», «Dal», «Al»,
  nei 7 file; il template usa anche «Chiudi» e «Conferma», che esistevano già.
- Il foglio ad altezza automatica non ha il problema che aveva fatto scartare il breakpoint a mezza
  altezza (calendario tagliato sui telefoni piccoli): si alza quanto il contenuto.

### Task 3: tasto indietro che chiude prima il calendario

L'overview chiedeva a `back()` di chiudere il calendario «per primo, prima degli alert». Nel piano
e nel codice l'ordine è: alert aperto → si chiude l'alert; poi il calendario (`closeOverlay()`);
poi `canLeave()`. Un alert, se c'è, sta sopra il calendario, quindi va chiuso per primo: lo stesso
ordine sta nella riga aggiunta in `.claude/rules/modali-e-ion-nav.md`, e un test della modale lo
fissa.

## Bug trovati

- `npm install` dentro wm-core, fatto per lanciare gli spec, crea una seconda copia di
  `@angular/forms` e di `swiper` che l'app risolve al posto delle sue: `ng serve` e `ng build`
  falliscono (`modal-save.component.ts`, `image-detail.component.ts`). Dopo i test
  `wm-core/node_modules` va rimossa.

- **Falso allarme della review formale (14/10/2026)**: un finder ha ipotizzato che la chiusura del
  calendario inline (`ionModalDidDismiss`, `bubbles: true`) risalisse fino alla modale del
  passaporto e risolvesse in anticipo il suo `onDidDismiss()` in `passport-modal.service.ts`. Sul
  codice di Ionic la catena sembrava reggere, ma la prova nel browser l'ha smentita: un listener
  agganciato alla modale del passaporto non riceve l'evento del calendario. Nessuna correzione.

## Decisioni

- **Prova su Android spostata dopo la PR** (scelta del dev, 14/10/2026): il form è stato provato
  nel browser; restano da provare sul telefono il tasto indietro con il calendario aperto (l'evento
  arriva solo da Capacitor), il trascinamento del foglio e la resa nella WebView. La logica del
  tasto indietro è coperta dagli spec.

- Tag Orchestrator: il dev ha scelto di non associare tag al ticket (né di ambiente né di
  contenuto).
- Numero seriale (richiesta del dev dopo il piano): selezionato diventava verde, perché Ionic
  colora un `ion-input` valido con `--highlight-color-valid`, che di default è `success`
  (`@ionic/core` `input.md.css:94`), e il campo, facoltativo, è sempre valido. Nel form si impone
  `--highlight-color-valid: var(--ion-color-primary)`.

- Review formale (`wm-review-ticket`, 14/10/2026): nessun bloccante. Cleanup applicati: la regola
  «fine prima dell'inizio» in `isEndBeforeStart()`, `toIsoDate()` al posto di `slice(0, 10)`,
  controllo sul tipo di `errors` nel 422, classe propria per «Conferma», e una riapertura del
  campo durante l'animazione di chiusura che il `didDismiss` precedente non annulla più
  (`onCalendarDismissed()` ignora la chiusura già gestita da `closeCalendar()`).

## Follow-up

- Il selettore di date potrebbe diventare un componente riusabile (`wm-date-range-picker`) se un
  secondo form ne avrà bisogno; oggi vive nel form del passaporto.
- Le funzioni di data generiche (`todayLocal`, `toIsoDate`, `isEndBeforeStart`, `intlLocale`)
  stanno in `passport.utils.ts`: da spostare in un modulo comune al secondo uso fuori dal passaporto.

