> Ticket: oc:8183

# Piano implementativo — pulsante e stato UI (wm-core)

Riferimento: `overview.md` in questa stessa cartella. Il canale di comunicazione verso il repo principale (task 3) va coordinato con `webmapp-app/docs/features/8183-.../plan.md` (task 6, `share.service.ts`).

## Task

1. **Campo `ugcTrackShareEnabled` (booleano) in `OPTIONS`** (wm-types) — modifica minima, nessuna decisione di design autonoma.
   `feat(oc:8183): campo ugcTrackShareEnabled in OPTIONS (wm-types)`

2. **Pulsante "Condividi"** in `ugc-track-properties.component.html`, visibilità gated dal selettore `confOPTIONS$` esistente sul nuovo campo.
   `feat(oc:8183): pulsante Condividi in ugc-track-properties`

3. **Stati UI e comunicazione verso l'alto**: stato `idle → generating → success/error` nel componente; al tap, emettere un `@Output` (coerente col pattern esistente `@Output('dismiss')`/`@Output('poi-click')`, non dispatch NgRx diretto) che il repo principale intercetta per avviare l'orchestrazione (screenshot → statistiche → compositing → plugin nativo). Il componente riceve poi l'esito (successo/errore) per aggiornare lo stato — definire il contratto esatto dell'evento/callback con `webmapp-app` prima di chiudere questo task.
   `feat(oc:8183): stati UI e output evento condivisione in ugc-track-properties`

4. **UI di errore con retry esplicito**: bottone/azione che ripropone lo stesso evento di condivisione, nessun retry automatico silenzioso.
   `feat(oc:8183): UI di errore con retry esplicito`

5. **Disabilitazione del pulsante durante `generating`**: previene il doppio tap che lancerebbe due pipeline di condivisione in parallelo (rischio identificato in Fase: challenge, mitigazione primaria qui lato UI — la guardia difensiva nel componente mini-map di `map-core` resta come seconda linea).
   `feat(oc:8183): disabilita il pulsante Condividi durante la generazione`

6. **Traduzioni** per bottone/stati/errori in tutte le lingue esistenti (`it/en/es/de/fr/pr/sq`, italiano lingua principale) — coerenti con le chiavi già in uso nel componente.
   `feat(oc:8183): traduzioni per il flusso di condivisione`

7. **Test unitari** per la state machine UI (idle/generating/success/error) e per la gating del pulsante sul flag conf — nessuna dipendenza da `OlMap`, quindi eseguibili normalmente in CI (a differenza dei test in `map-core`).
   `test(oc:8183): test unitari per stati UI del pulsante Condividi`
