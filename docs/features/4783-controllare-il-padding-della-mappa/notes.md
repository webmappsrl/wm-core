> Ticket: oc:4783

# Notes — Controllare il padding della mappa

## Deviazioni dal piano

- Il coinvolgimento di questo repo non era previsto nell'overview iniziale (lo scope originale era limitato a `map-core`). È emerso a posteriori: il developer aveva già aggiunto `[wmMapPadding]="[20, 20, 20, 20]"` a `modal-ugc-uploader.component.html` per la verifica manuale del fix (Step 4 del piano in `map-core`), e ha poi deciso di renderlo permanente. `overview.md` di questo repo è stato creato dopo l'implementazione per documentare questa estensione di scope, non prima come da ordine di fase standard del workflow.
- Branch `feature/oc-4783-controllare-il-padding-della-mappa` creato dopo che la modifica al file era già presente in working tree (non da branch pulito) — la modifica è stata comunque portata correttamente sul nuovo branch, nessuna perdita.

## Bug trovati
Nessuno.

## Decisioni
- Il binding resta permanente (vedi `map-core/docs/features/4783-controllare-il-padding-della-mappa/notes.md` per il contesto completo della decisione).

## Follow-up
Nessuno specifico a questo repo — vedi i follow-up in `map-core/docs/features/4783-controllare-il-padding-della-mappa/notes.md`.
