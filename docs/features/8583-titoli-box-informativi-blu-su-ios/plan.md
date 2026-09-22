> Ticket: oc:8583

# Piano — Bug: titoli dei box informativi in blu invece che neri su iOS

## Task 1 — Fix CSS su `.wm-config-detail-header`

File: `wm-core/projects/wm-core/src/config-detail/config-detail.component.scss`

Aggiungere alla regola `.wm-config-detail-header` (righe 70-83):

```scss
color: var(--wm-color-dark, #1a1a1a);
-webkit-appearance: none;
```

Nessun'altra regola va toccata: `.wm-config-detail-title` eredita il colore dal bottone padre.

Commit: `fix(oc:8583): testo del titolo box informativo nero anche su iOS`

## Task 2 — Verifica manuale

- Verificare su device/simulatore iOS che il titolo appaia nero.
- Verificare che Android/web restino invariati (nessuna regressione visiva).

Non automatizzabile in questa sessione (nessun ambiente iOS disponibile).
