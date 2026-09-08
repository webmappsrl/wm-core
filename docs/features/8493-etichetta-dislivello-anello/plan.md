> Ticket: oc:8493

# Plan — Etichetta dislivello su percorsi ad anello

Fix piccolo, già implementato dallo sviluppatore prima dell'avvio di questo workflow di documentazione. Piano ricostruito a posteriori per tracciabilità.

## Task

1. **`tab-detail.component.html`**: label condizionale `{{ (properties?.roundtrip ? "slope" : "ascent") | wmtrans }}` sulla riga dislivello — già applicato.
2. **Chiavi i18n `slope`** aggiunte in tutte le lingue (it/en/de/es/fr/pr/sq) — già applicato.
3. **Fix collisione i18n** (emerso in Fase: challenge): corretta la traduzione di `slope` in de/es/fr/pr/sq per allinearla alla radice già usata da `ascent`/`descent` in ciascuna lingua, invece che a `pendenza` — applicato in questo ciclo di documentazione.
4. Commit su branch dedicato (`feature/oc-8493-etichetta-dislivello-anello`), push, PR verso `develop`.

Nessun task di implementazione nuovo richiesto oltre al punto 3.
