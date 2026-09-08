> Ticket: oc:8458

# Accordion wm-config-detail: apertura multipla e rimozione scrollIntoView

## Cosa cambia

`ConfigDetailComponent` (`wm-config-detail`) passa da apertura esclusiva (`_openItem`, un solo item aperto alla volta, aprirne uno chiude il precedente) a uno stato multi-apertura: più item possono restare aperti contemporaneamente, senza alcun limite al loro numero. Di conseguenza viene rimosso interamente il meccanismo di "assestamento" introdotto in oc:8427 (listener `transitionend`, debounce/fallback timer, `_pendingToggleEvent`) e l'evento custom `configDetailSettled` che dispacciava — il suo unico scopo (notificare i consumer per lo scroll automatico) viene eliminato in questo stesso ciclo. `home.component.ts` perde l'handler `onConfigDetailSettled()`/`_isFullyInView()` e il relativo binding nel template. `showLess(groupIndex)` (pulsante "Mostra meno") chiude solo gli item del gruppo compresso che tornano nascosti, non più tutti gli item aperti nel componente.

Comportamento condiviso da **tutti gli shard** — nessun `fileReplacements`, nessuna eccezione per camminiditalia.

## Perché

Richiesta esplicita: permettere di consultare più blocchi informativi contemporaneamente (Layer/EcTrack/EcPoi) senza chiusura automatica degli altri, ed eliminare lo scroll automatico che oggi riporta in vista l'header dell'item appena aperto — percepito come invasivo e non più necessario una volta rimossa l'esclusività (che era la causa reale del "salto" percepito: aprire un item chiudeva quello sopra, spostando l'header cliccato).

## Requisiti

- [ ] `ConfigDetailComponent`: sostituire `_openItem: ConfigDetailInfoBoxItem | null` con uno stato multi-item (es. `Set<ConfigDetailInfoBoxItem>`); `isOpen(item)` verifica l'appartenenza al set; `toggle(item)` aggiunge/rimuove l'item dal set senza toccare gli altri. Nessun limite al numero di item aperti simultaneamente.
- [ ] Rimuovere interamente il meccanismo di assestamento: listener `transitionend` (`_onTransitionEnd`), `_settleDebounceId`/`_settleFallbackId`/`SETTLE_DEBOUNCE_MS`/`SETTLE_FALLBACK_MS`, `_pendingToggleEvent`, `_flushPendingToggle()`, e il dispatch del `CustomEvent('configDetailSettled')`.
- [ ] `groups` setter: aggiornare il reset dello stato (nuovo stato multi-item invece di `_openItem = null`), rimuovere il reset di `_pendingToggleEvent`/timer (non più esistenti).
- [ ] `showLess(groupIndex)`: chiudere solo gli item del gruppo `groupIndex` che, dopo la riduzione a `PAGE_SIZE`, non sono più tra gli `shownItems` di quel gruppo — gli item aperti in altri gruppi restano aperti (decisione esplicita in reverse-interaction: un'azione locale ha effetto locale).
- [ ] `ngOnDestroy`/costruttore: rimuovere l'`addEventListener`/`removeEventListener` di `transitionend` sull'host, ormai inutile.
- [ ] `home.component.ts`/`.html`: rimuovere `onConfigDetailSettled()`, `_isFullyInView()`, il binding `(configDetailSettled)="onConfigDetailSettled($event)"` su `wm-home-layer`.
- [ ] Riscrivere `config-detail.component.spec.ts`: rimuovere i test su `configDetailSettled`/assestamento (oc:8427); aggiungere test che verificano il multi-open (aprire due item lascia entrambi aperti) e che `showLess` chiude solo gli item del proprio gruppo, non quelli di altri gruppi.
- [ ] Riscrivere `home.component.spec.ts`: rimuovere i test su `scrollIntoView`/`onConfigDetailSettled` (oc:8427).
- [ ] [UX] Aggiungere `[attr.aria-multiselectable]="true"` sul contenitore `.wm-config-detail` (`config-detail.component.html`): requisito vincolante (non opzionale) — senza, il componente esporrebbe `aria-expanded="true"` su più header contemporaneamente in un contenitore che non dichiara supporto all'espansione multipla, violazione del pattern ARIA accordion standard (emerso in Fase: challenge).

## Rischi

- Rimuovere l'intero meccanismo di assestamento elimina anche l'infrastruttura che permetteva di agganciare comportamenti alla fine dell'animazione — se in futuro servisse un hook "item aperto e visibile" (es. analytics), andrebbe riscritto da zero. Rischio accettato: nessun altro consumer lo usa oggi.
- Il refactor di `_openItem` → stato multi-item tocca il cuore del componente (`isOpen`/`toggle`), montato da 3 punti diversi su 2 repo: `home-layer.component.html`/`track-properties.component.html` (wm-core) e `poi-properties.component.html` (**webmapp-app**, repo principale — non wm-core) — una regressione qui si propaga a tutte le viste Layer/Track/POI, su tutti gli shard.
- `showLess(groupIndex)` con chiusura scoped al gruppo è leggermente più complesso della semplice `this._openItem = null` attuale (serve determinare quali item del gruppo restano visibili dopo la riduzione a `PAGE_SIZE`) — un bug qui lascerebbe uno stato "aperto" per un item non più renderizzato (orfano nel Set, innocuo perché `isOpen()` è chiamato solo su item che `visibleEntries` renderizza davvero, ma va verificato con test).

## Out of scope

- Nessuna modifica alla paginazione "Mostra altro"/`PAGE_SIZE` o al layout CSS (spacing, `isGroupStart`, animazione `grid-template-rows` per singolo item).
- Nessun limite al numero di item aperti simultaneamente (deciso esplicitamente: apertura illimitata).
- Nessuna personalizzazione per-shard: comportamento condiviso da tutti.

## Moduli toccati

- `projects/wm-core/src/config-detail/config-detail.component.ts`
- `projects/wm-core/src/config-detail/config-detail.component.html` (eventuale `aria-multiselectable`)
- `projects/wm-core/src/config-detail/config-detail.component.spec.ts`
- `projects/wm-core/src/home/home.component.ts`
- `projects/wm-core/src/home/home.component.html`
- `projects/wm-core/src/home/home.component.spec.ts`
