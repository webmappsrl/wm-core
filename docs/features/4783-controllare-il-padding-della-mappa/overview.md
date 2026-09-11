> Ticket: oc:4783

# Controllare il padding della mappa

## Cosa cambia
`modal-ugc-uploader.component.html:25-29` mantiene il binding `[wmMapPadding]="[20, 20, 20, 20]"` su `<wm-map>` (posizionato prima di `[wmMapGeojson]`, come da convenzione di ordine attributi documentata in `map-core/CLAUDE.md`). Il fix vero e proprio (perché il padding produca un effetto visibile) è nel submodule `map-core` — vedi `map-core/docs/features/4783-controllare-il-padding-della-mappa/overview.md`.

## Perché
Il bug originale (padding senza effetto) era stato riprodotto proprio con questo binding. Durante la verifica del fix in `map-core`, si è deciso di rendere il binding permanente invece di rimuoverlo dopo il test: ora che il padding funziona, migliora la leggibilità della traccia caricata nel flusso di upload UGC rispetto ai bordi della mappa di anteprima.

## Requisiti
- [x] `[wmMapPadding]="[20, 20, 20, 20]"` presente e permanente su `<wm-map>` in `modal-ugc-uploader.component.html`

## Rischi
- Nessun rischio aggiuntivo oltre a quelli già documentati in `map-core/docs/features/4783-controllare-il-padding-della-mappa/overview.md` (il comportamento dipende interamente dal fix in `map-core`).

## Out of scope
- Binding di `wmMapPadding` su `modal-success` (repo principale `webmapp-app`) — non richiesto

## Moduli toccati
- `core/src/app/shared/wm-core/projects/wm-core/src/modal-ugc-uploader/modal-ugc-uploader.component.html`
