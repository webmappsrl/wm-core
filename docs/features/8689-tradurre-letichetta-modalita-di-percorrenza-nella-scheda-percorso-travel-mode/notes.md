> Ticket: oc:8689

# Notes — Tradurre l'etichetta «Modalità di percorrenza» nella scheda percorso (Travel mode)

## Divergenze dal piano, task per task

### Task 2: verifica manuale su Vivi Lama

- **Passo 4 [UX] non eseguibile nell'app.** Vivi Lama offre solo `it` ed `en`: il controllo che i testi più lunghi (es «Modo de desplazamiento», fr «Mode de déplacement») non
  vengano troncati non si è potuto fare a vista. In inglese e in italiano l'etichetta è intera.
- **Passo 2: `npm start` richiede Node 22.** Con il Node di default (16) la CLI di
  Angular si ferma subito; serve `nvm use 22` prima dell'avvio.

## Bug trovati

Nessuno.

## Decisioni

- **Tag Orchestrator non proposti**, su richiesta del dev (né di ambiente né di contenuto).
- **Nessuno spec.** Previsto all'inizio uno spec sui file di lingua, tolto dopo la challenge: non
  leggerebbe il template, quindi non intercetta una chiave scritta diversa lì, e in questa PR non
  girerebbe perché la CI di `wm-core` non lancia i test. Per questa etichetta la verifica è
  manuale, nell'app, in italiano e in inglese.
- **Testi di de, fr, es, pr, sq** proposti in fase di pianificazione e approvati dal dev: un'etichetta
  descrittiva del modo di spostarsi invece della traduzione letterale di «percorrenza».
- **Verifica eseguita** sulla webapp in locale puntata su Vivi Lama (`shardName: 'maphub'`,
  `appId: 2`), percorso «Alpe Sigola» (`?track=7`): «Modalità di percorrenza» in italiano,
  «Travel mode» in inglese. `environment.ts` ripristinato dopo la verifica.

## Follow-up

- Le etichette «Tipo mappa», «Dati», «Percorsi» del pannello del tipo di mappa restano in italiano.
- I due pulsanti a piedi / in bici hanno solo l'icona, senza `aria-label`. Servirebbero chiavi
  nuove («A piedi», «In bici»): `walking` esiste già, ma in italiano vale «Passeggiata».
- Da verificare: il segment ha `value="walk"` fisso nel template; cambiando percorso senza che il
  componente venga ricreato, potrebbe restare selezionata la bici con il tempo a piedi.
- L'app riceve il fix solo quando `webmapp-app` aggiorna il puntatore a `wm-core` (dei dev).
