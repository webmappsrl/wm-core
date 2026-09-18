# Box informativi configurabili (`wm-config-detail`)

## Come funziona oggi

Un accordion custom, **non** `ion-accordion`: header `<button>` nativo, `aria-expanded`/`aria-controls` scritti a mano, `aria-multiselectable="true"` sul contenitore, animazione del contenuto con `grid-template-rows` a `0.3s`. Paginazione a 10 item più "Mostra altro/meno", embed `innerHTML` lazy, iframe responsive senza `aspect-ratio` forzato.

**L'apertura è multipla e illimitata**: `_openItems: Set<T>` (era `_openItem: T|null`). `showLess(groupIndex)` chiude solo gli item del proprio gruppo, non tutti quelli aperti nel componente.

I tipi condivisi stanno in `@wm-types/config` (`ConfigDetailBox`, `ConfigDetailInfoBox`, `ConfigDetailInfoBoxItem`, senza prefisso `I`); wm-core estende solo `ILAYER.config_detail`. I consumer (`home-layer`, `track-properties`) espongono solo `[groups]="…?.config_detail"`: il dispatch di `box_type` è centralizzato nel componente.

## Perché così

- **Nessun tetto agli item aperti e nessun "chiudi tutto"** (oc:8458): il rischio di performance con iframe multipli è stato valutato e accettato in fase di challenge — il contenuto di `config_detail` lo cura il content editor, non arriva da input libero.
- **`aria-multiselectable="true"` è vincolante, non opzionale** (oc:8458): senza, il componente esporrebbe `aria-expanded="true"` su più header in un contenitore che non dichiara di supportare l'espansione multipla — violazione del pattern ARIA accordion.
- **Un'azione locale ha effetto locale** (oc:8458): "Mostra meno" su un gruppo non può chiudere gli item di un altro. Implementato con una sola chiamata a `_visibleItemsInGroup()` più `shownItems.slice(PAGE_SIZE)`, sfruttando l'invariante che il pulsante esiste solo se il gruppo è già espanso oltre `PAGE_SIZE`.
- **Il margine sta sul wrapper interno, non sul tag host** (oc:8181): `.wm-config-detail` ha `*ngIf="visibleEntries.length"` e porta `--wm-feature-details-margin`; i consumer montano sempre il tag host senza `*ngIf` esterno, quindi marginare l'host lascerebbe spazio vuoto quando `config_detail` è assente.
- **Nessun flag `OPTIONS.*` di rollout** (oc:8458): a differenza di `showTrackRemainingDistance`, `ugcTrackShareEnabled` e `showFavorites`, qui il cambio di interazione è stato giudicato minore in fase di challenge, non abbastanza rischioso da meritare un kill switch.

## Il meccanismo di assestamento è stato rimosso, non isolato

oc:8427 aveva introdotto un listener `transitionend`, un debounce/fallback timer e un `CustomEvent('configDetailSettled')` per far assestare l'accordion prima dello scroll automatico. In oc:8458 è stato **cancellato per intero**, perché il suo unico consumer — lo scroll automatico nei due antenati `home.component.ts` e `map-details.component.ts` di webmapp-app — spariva nello stesso ciclo. Se in futuro servisse un hook "item aperto e visibile", per analytics o altro, va riscritto da zero: non c'è niente da riattivare.

`ConfigDetailToggleEvent` è stato rimosso da wm-types per lo stesso motivo. **L'ordine è vincolato**: wm-core e webmapp-app devono smettere di importarlo *prima* che wm-types lo rimuova, altrimenti si rompe la build TypeScript di chi bumpa il submodule per primo.

## Trappole verificate

- **Spacing del pulsante "Mostra altro"** (oc:8181): `> *:last-child { margin-bottom: 0 }` sul wrapper (non `:last-of-type` sull'item) più `margin-top: 16px` sul toggle, per evitare il collasso dei margini fra ultimo item e pulsante.
- **Due istanze DOM sullo stesso layer** (oc:8181): tab Home e pannello Map montano entrambi `wm-home-layer`/`wm-config-detail` per il layer in store. Comportamento accettato; i test E2E devono limitare lo scope a `wm-map-details` con `testIsolation: false`.
- **`_elRef` resta nel costruttore pur non essendo più letto** (oc:8458): serviva solo al meccanismo rimosso. Lasciato per non allargare la firma oltre il pianificato; TypeScript non segnala come inutilizzati i parametri costruttore con modificatore di accesso.
- **`_resolve()` duplica il fallback di `WmTransPipe`** per filtrare le righe senza traduzione (oc:8181): non unificato, il blast radius di una pipe condivisa è troppo ampio per farlo senza conferma.
