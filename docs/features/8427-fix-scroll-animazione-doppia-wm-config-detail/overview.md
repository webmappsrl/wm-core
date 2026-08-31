> Ticket: oc:8427

# Fix scroll e animazione doppia in wm-config-detail (accordion + modalità full)

## Cosa cambia

`wm-config-detail` (l'accordion custom usato per i box informativi di layer/POI/track — STORIA, ACQUA, ecc.) attualmente non gestisce in alcun modo lo scroll quando l'utente apre un nuovo item. L'apertura esclusiva (`_openItem`, un solo item aperto alla volta) chiude automaticamente l'item precedente: se l'item appena chiuso era più lungo di quello appena aperto, il contenuto sopra/sotto si ridistribuisce, ma lo `scrollTop` del contenitore resta invariato — l'utente si ritrova a guardare uno spazio vuoto o un punto sbagliato invece del box appena aperto.

Il fix **non** chiama `scrollIntoView` internamente al componente. Introduce invece un contratto esplicito verso il consumer: `wm-config-detail` notifica ogni toggle (apertura e chiusura) tramite `@Output`, lasciando al consumer la responsabilità di decidere *quando* eseguire lo scroll — perché solo il consumer (es. `wm-map-details`) sa se c'è un'animazione di resize del pannello con cui sequenziare lo scroll (vedi overview gemello in `webmapp-app`, bug 2).

## Perché

Segnalato dal developer durante un test manuale su un cammino con box "STORIA" lungo: aprendo STORIA, scrollando per leggerlo, poi aprendo ACQUA (più corto), la vista non si sposta e mostra un'area vuota — comportamento palesemente rotto per la UX, non un edge case raro (capita con qualunque coppia item-lungo → item-corto).

## Requisiti

- [ ] `wm-config-detail` espone un nuovo `@Output()` che notifica ogni toggle (sia apertura sia chiusura) di un item, includendo l'elemento header appena aperto quando si tratta di un'apertura. **Il componente non chiama `scrollIntoView` da sé** — delega interamente al consumer.
- [ ] Per i consumer "semplici" (es. `home-layer` in tab Home, nessun pannello ridimensionabile coinvolto): sottoscrivono l'evento e chiamano `scrollIntoView({block: 'start', behavior: 'smooth'})` sull'header ricevuto, subito in caso di apertura, nulla in caso di chiusura.
- [ ] Per il consumer `wm-map-details` (repo principale, vedi overview gemello): la sequenza di scroll è coordinata con il resize del pannello — vedi requisiti nell'overview di `webmapp-app`.
- [ ] Il fix riguarda esclusivamente il toggle apertura/chiusura di un singolo item (accordion). I pulsanti "Mostra altro"/"Mostra meno" (`showMore()`/`showLess()`) restano fuori scope per lo scroll automatico (nessun requisito UX segnalato su di loro) — vedi "Out of scope" per l'unico edge case noto non risolto.
- [ ] Lo scroll resta sempre `behavior: 'smooth'`, senza differenziazione per `prefers-reduced-motion` in questo ciclo (decisione esplicita del developer, da rivalutare in futuro).
- [ ] Verifica manuale su device reale (iOS WKWebView e Android WebView via Capacitor, non solo browser desktop) prima del commit — il supporto a `scrollIntoView({behavior:'smooth'})` è storicamente più fragile su WKWebView rispetto a Chromium.

## Rischi

- **Item già in cima al viewport**: se l'item aperto è già visibile in cima, `scrollIntoView` non deve produrre un movimento percettibile spurio — comportamento nativo di `scrollIntoView` già gestisce questo caso (no-op se già in posizione).
- **Contenitore scrollabile non ovvio**: lo scroll reale avviene su `ion-card-content` (overflow-y: auto, in `map-details.component.scss`), non su `wm-config-detail` stesso — `scrollIntoView` nativo del browser individua comunque il primo antenato scrollabile automaticamente, ma va verificato che non ci siano altri contenitori scrollabili annidati (es. tab Home vs pannello Map, vedi "Due istanze DOM" in CLAUDE.md oc:8181) che confondano il comportamento.
- **Tripla animazione sovrapposta in modalità full (rischio cross-repo, mitigato dal design a Output)**: senza coordinamento esplicito, in modalità `full` si sovrapporrebbero la transizione CSS dell'item (300ms), il resize del pannello host (bug 2) e lo smooth-scroll — tre animazioni indipendenti sullo stesso spazio visivo, potenzialmente peggio del bug originale. Il contratto `@Output` (invece di uno scroll interno immediato) è la mitigazione: il consumer che conosce il resize (`wm-map-details`) decide di ritardare lo scroll fino a resize concluso.
- **Asimmetria `prefers-reduced-motion` accettata come debito**: il resize del pannello (bug 2, repo principale) già rispetta questa preferenza, la transizione CSS dell'item e ora anche lo scroll no — accettato esplicitamente dal developer per questo ciclo, da rivalutare in futuro.
- **`showLess()` chiude implicitamente l'item aperto senza compensare lo scroll** (stesso sintomo del bug originale, ma sui pulsanti "Mostra meno", esplicitamente fuori scope) — vedi "Out of scope".

## Out of scope

- Pulsanti "Mostra altro"/"Mostra meno": nessuno scroll automatico introdotto. Nota: `showLess()` può chiudere implicitamente l'item aperto (se esce dalla paginazione ridotta) riproducendo lo stesso sintomo del bug originale in un caso limite — accettato come limite noto, non risolto in questo ciclo.
- Gestione di `prefers-reduced-motion` per questo scroll (rimandata a un ciclo futuro, richiesta esplicita del developer: "no falo smooth per adesso poi valuto").
- Qualsiasi modifica alla logica di apertura esclusiva (`_openItem` singolo) — resta invariata.
- Introduzione di una costante condivisa cross-repo per le durate delle animazioni (CSS 300ms qui, debounce/timeout in `webmapp-app`) — sproporzionato per questo bug fix; mitigato con un commento nel codice che referenzia esplicitamente il file/riga dell'altro repo.

## Moduli toccati

- **`core/src/app/shared/wm-types/src/config.ts`** (submodule wm-types, terzo repo) — nuovo tipo condiviso `ConfigDetailToggleEvent` (`{opening: boolean; headerElement: HTMLElement | null}`), payload del nuovo `@Output()`. Precedente: stesso trattamento di `ConfigDetailBox`/ecc. (oc:8181), per coerenza decisa dal developer in Fase: write-plan (in alternativa al pattern oc:8183, che tiene un contratto Output/Input UI locale al componente wm-core).
- `core/src/app/shared/wm-core/projects/wm-core/src/config-detail/config-detail.component.ts` — nuovo `@Output() toggled: EventEmitter<ConfigDetailToggleEvent>` (import da `@wm-types/config`), nessuna chiamata a `scrollIntoView` interna.
- `core/src/app/shared/wm-core/projects/wm-core/src/config-detail/config-detail.component.html` — `(click)="toggle(entry.item, $event)"` per recuperare l'header cliccato.
- `core/src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.ts`/`.html` — pass-through: nuovo `@Output() configDetailToggled` che inoltra l'evento di `wm-config-detail` (necessario perché `wm-config-detail` è annidato nel template di `home-layer`, non raggiungibile direttamente dai consumer di `wm-home-layer`).
- `core/src/app/shared/wm-core/projects/wm-core/src/track-properties/track-properties.component.ts`/`.html` — stesso pattern pass-through di `home-layer` (montato solo dentro `wm-map-details`, in `map.page.html`, repo principale — nessun consumer "semplice" diretto per questo componente).
- `core/src/app/shared/wm-core/projects/wm-core/src/home/home.component.ts`/`.html` — consumer "semplice" per il tab Home: sottoscrive `(configDetailToggled)` di `wm-home-layer` e chiama `scrollIntoView` subito in apertura, nessuna azione in chiusura.
- `core/src/app/shared/wm-core/projects/wm-core/src/config-detail/config-detail.component.spec.ts` (nuovo), `home-layer.component.spec.ts`/`track-properties.component.spec.ts` (nuovo se assente)/`home.component.spec.ts` (nuovo se assente) — test unitari per ciascun livello del pass-through.
- **Consumer nel repo principale (`wm-map-details`, `poi-properties`, `map.page`)**: vedi overview gemello in `webmapp-app` per la logica di coordinamento con il resize del pannello.
