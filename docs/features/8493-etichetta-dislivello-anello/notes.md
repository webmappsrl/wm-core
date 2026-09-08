> Ticket: oc:8493

# Notes — Etichetta dislivello su percorsi ad anello

## Deviazioni dal piano

Il fix era già interamente implementato (label + chiavi i18n) prima dell'avvio del workflow `wm-plan` — non è stato scritto un piano prima del codice, contrariamente al flusso standard. Questo ciclo si è limitato a documentare a posteriori (overview/plan/notes), sottoporre il codice a Fase: challenge, e correggere quanto emerso.

## Bug trovati

- **Collisione i18n**: la chiave `slope` (nuova) era stata tradotta in 5 lingue su 7 (en/de/es/fr/sq) copiando esattamente la parola già usata dalla chiave `pendenza` (gradiente % istantaneo nel grafico altimetrico, `slope-chart.component.html`), reintroducendo la stessa ambiguità "che parola indica cosa" che il ticket voleva risolvere. Trovato dalla Fase: challenge (subagente adversariale), verificato manualmente confrontando le traduzioni di `slope`/`ascent`/`descent`/`pendenza` in tutti i file `localization/i18n/*.ts`. Corretto allineando `slope` alla radice già usata da `ascent`/`descent` per lingua (vedi overview.md → Rischi).

## Decisioni

- **Inglese lasciato invariato (`slope`)** nonostante colida ancora con `pendenza` (entrambe traducono "Slope"): la collisione è preesistente ad `ascent`="Slope +" (introdotta prima di questo ticket), non aggravata da questo fix — cambiarla avrebbe richiesto toccare `ascent`/`descent` esistenti, fuori scope per un fix di etichetta su un solo caso (roundtrip).
- **Portoghese cambiato da `Inclinação` a `Elevação`** per allinearsi alla radice già usata da `ascent`="Elevação +"/`descent`="Elevação -", anche se `Inclinação` non collideva con `pendenza`="Pendência" — preferita la coerenza con la convenzione esistente della lingua piuttosto che una parola diversa ma comunque priva di collisione.
- **`ugc-track-data.component.html`** esplicitamente escluso dallo scope (vedi overview.md → Out of scope): mostra sempre "ascent" incondizionatamente, contesto diverso (tracce UGC vs layer editoriali).

## Follow-up

- Debito noto non affrontato: in inglese `pendenza`="Slope" e `ascent`="Slope +" condividono già la stessa radice prima di questo ticket — se in futuro si volesse eliminare del tutto l'ambiguità andrebbe rivista l'intera terminologia inglese di `ascent`/`descent`/`pendenza`, non solo la nuova chiave `slope`.
- Nessun test automatico (unit/e2e) aggiunto — `tab-detail.component` non ha `.spec.ts` preesistente, coerente con l'assenza di copertura test su questo componente prima di questo ciclo.
