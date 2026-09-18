> Ticket: oc:8589

# Notes — Bug grafico: linea separatrice logo/nome incoerente nella home dei layer

## Deviazioni dal piano

Il piano prevedeva la verifica visiva (Step 2-6) eseguita dall'implementatore stesso, avviando
il dev server e osservando il rendering. Il primo tentativo è stato bloccato da un mismatch di
versione Node (v18.13.0 installato, richiesta v20.19+ da Angular): l'implementatore ha sostituito
la verifica con un'analisi statica del CSS, poi giudicata insufficiente dal task reviewer
(rilievo Important, plan-mandated — l'unico meccanismo di verifica previsto dal piano è quello
visivo). Un secondo tentativo con `nvm use 20` e gli strumenti browser è stato avviato ma
interrotto a metà su richiesta del developer, che ha preferito eseguire la verifica visiva
manualmente. La verifica è stata infine completata dal developer stesso, direttamente nel
browser con lo shard `camminiditalia` servito in locale — confermata corretta su "Cammino
Balteo" (titolo 1 riga) e su un layer con titolo più lungo.

## Bug trovati

Nessuno oltre al bug oggetto del ticket.

## Decisioni

- **Workspace SDD disambiguato manualmente**: lo script `scripts/sdd-workspace` di
  `subagent-driven-development` deriva la directory di lavoro dal solo basename del file di
  piano (`plan.md`), che collideva con il ledger di un piano precedente non collegato (oc:8427,
  altro file chiamato `plan.md` in un'altra cartella). Usata una directory disambiguata
  (`.superpowers/sdd/8589-altezza-fissa-separatore-logo-titolo-home-layer/`) per non toccare un
  ledger che non era di questo lavoro — nessuna modifica allo script.
- **Package di review generato manualmente** invece che con `scripts/review-package`: quello
  script assume che l'implementer abbia già committato (calcola un range di commit), ma il
  vincolo di questo progetto vieta i commit prima dell'approvazione del developer — quindi il
  diff di review è stato prodotto a mano sul working tree non committato.

## Follow-up

- Nessun test automatico di regressione visiva su questo componente (accettato come rischio
  minore in overview.md — non introdotto da questo fix, preesistente).
- Ambiente di sviluppo locale: Node di default via `nvm` è v18.13.0, sotto il minimo richiesto da
  Angular 20 (v20.19+); serve `nvm use 20` (o superiore) prima di `npm start`. Non è stato
  modificato nulla nel repo per questo — è una configurazione locale della macchina, non un
  problema del progetto.
