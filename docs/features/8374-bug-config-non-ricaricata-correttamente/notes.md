> Ticket: oc:8374

# Notes — Bug config non ricaricata correttamente

## Deviazioni dal piano

Nessuna deviazione di sostanza. L'unica differenza rispetto al codice letterale del piano è un rafforzamento di due asserzioni di test in `api-cache-handler.spec.ts` (aggiunta di un handler `next` per verificare l'oggetto emesso, oltre al solo controllo su `localStorage`), emerso da un fix round richiesto dalla review isolata di Task 1 — vedi sezione "Decisioni" sotto.

## Bug trovati

Nessun nuovo bug introdotto rilevato durante l'esecuzione, oltre a quanto emerso e già discusso nelle fasi di challenge/review (vedi `overview.md` → sezione Rischi).

## Decisioni

- **Fix round 1 su Task 1 (test coverage):** la review isolata di Task 1 ha segnalato (Important, plan-mandated) che i test "setItem rejects"/"setItem succeeds" (copiati verbatim dal piano) asserivano solo su `complete()`/`localStorage`, mai su `next()` — non avrebbero intercettato una regressione in cui `observer.next(data)` venisse spostato dentro il blocco `try`. Accettato il finding nonostante fosse plan-mandated (rafforza esattamente la garanzia di regressione che il ticket vuole proteggere, nessun downside) e applicato un fix additivo (asserzione `next` su entrambi i test). Re-review mirata: addressed, nessuna nuova rottura.
- **Blocco Node version durante Task 2:** l'implementer di Task 2 ha inizialmente riportato `DONE_WITH_CONCERNS` non riuscendo a eseguire i test (Node v18.13.0 di default nel suo sandbox, Angular CLI di questo repo richiede ^20.3.14). Risolto fornendo il comando `source ~/.nvm/nvm.sh && nvm use 20.19.0` (versione già installata su questa macchina) — non un problema del codice, solo un gap di ambiente nel sandbox del subagent. Re-dispatch ha prodotto evidenza TDD reale (RED 2/3 falliti su codice vecchio, GREEN 3/3 su codice nuovo).
- **Esecuzione con vincolo "no commit" durante subagent-driven-development:** per rispettare il vincolo di progetto (commit solo dopo approvazione esplicita del developer), i review package interni alla fase di esecuzione sono stati costruiti come diff di working tree (`git diff` non ancora committato) invece che come commit-range, adattando i meccanismi standard della skill `subagent-driven-development`. Nessun impatto sul risultato finale, solo sul processo interno.
- **Review finale eseguita con `wm-skills:wm-review-ticket` invece della review whole-branch della skill di esecuzione:** su richiesta esplicita del developer, la review finale è stata condotta con 5 finder paralleli secondo il formato `wm-review-ticket` (correctness, side-effect/bug, deviazioni, cleanup, altitude) invece del reviewer whole-branch generico di `subagent-driven-development`. Verdetto: **APPROVATO CON RISERVE** — nessun bug di correttezza o regressione user-facing, 9/9 test verificati passanti a runtime.

## Follow-up

Emersi dalla review finale (`wm-skills:wm-review-ticket`), non bloccanti, non risolti in questo ciclo:

- **Robustezza `handleApiCache`:** il next-handler `async` (necessario per `await synchronizedApi.setItem(...)`) fa sì che un eventuale `throw` sincrono in `updateData(data)` (fuori dal blocco `try/catch` che copre solo la scrittura cache) diventi una unhandled rejection invece di essere instradato a `observer.error()`/`observer.complete()` come accadeva col next-handler sincrono precedente — ricreerebbe silenziosamente la stessa classe di bug che questo ticket risolve, se un futuro consumer passasse un `updateData` che può lanciare (oggi né `ConfService` né `IconsService` possono farlo). Fix suggerito: spostare `updateData(data);` dentro il blocco `try` esistente in `api-cache-handler.ts`.
- **Copertura test incompleta rispetto al requisito 7 letterale:** manca un test end-to-end su `ConfService.getConf()` per il caso "cache corrotta" (esiste solo a livello di `handleApiCache` in isolamento) — il requisito nell'overview menziona esplicitamente "assente **o corrotta**". Nessun impatto funzionale oggi (verificato), solo una lacuna nella rete di sicurezza contro regressioni future.
- Findings minori di leggibilità (non urgenti): duplicazione di stringhe magiche e pattern di mock tra i due nuovi file di test; `forceFreshRequest` come 5° parametro booleano posizionale (boolean trap, da rivedere se in futuro serve un secondo flag simile); mancano commenti sul *perché* del caso `carg` in `conf.service.ts:52` e sulla condizione a tre termini in `api-cache-handler.ts:27-30`.
- **Debito preesistente segnalato ma fuori scope** (non introdotto da questo fix): `{...response.body}` seguito da `if (data)` in `api-cache-handler.ts` non può mai essere falso (uno spread di `null`/`undefined` produce sempre `{}`, sempre truthy) — un body 200 nullo verrebbe comunque trattato come dato valido. Preesistente, non toccato da questo diff.
