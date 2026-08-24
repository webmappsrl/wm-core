> Ticket: oc:8369

# Notes — Eliminare log in produzione (wm-core)

## Deviazioni dal piano

Nessuna deviazione — tutte le modifiche seguono esattamente le tabelle di classificazione di `plan.md`, verificate riga per riga dopo l'esecuzione (155/155 test Karma passati).

## Bug trovati

Nessuno.

## Decisioni

- I `console.error`/`console.warn` di validazione PostHog in `wm-core.module.ts:231-289` (fuori da `catch`) restano intatti, non commentati — corretta un'incoerenza della prima stesura di `overview.md` che li classificava erroneamente come "commenta" (vedi Fase: challenge).
- `utils/localForage.ts:583` (`updateStatus()`) e `store/features/ec/ec.service.ts:91,150` ("No changes detected...") commentati (non cancellati) perché unico segnale diagnostico di aree già documentate come fragili/legate a bug recenti (oc:8190, oc:8374).
- `services/posthog-capacitor.client.ts` e `store/features/ec/utils.ts` esclusi interamente dal triage — hanno test unitari che asseriscono esplicitamente sulle chiamate `console.*` (`expect(console.log).toHaveBeenCalledWith(...)`, `spyOn`).
- Commenti pre-esistenti senza marker (in `storage.service.ts` e `ugc.service.ts`) normalizzati al formato `// DEBUG:` per coerenza e ricercabilità futura.

## Follow-up

- `utils/console-override.ts` resta codice morto — vedi notes.md del repo principale per il contesto completo.
- Debito noto pre-esistente in `share.service.ts` (repo principale, non wm-core) — non correlato a questo file.
