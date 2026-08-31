> Ticket: oc:8427

# Note — deviazioni dal piano e correzioni post-review

## Architettura shippata vs `plan.md`/`overview.md`

- **Nessun `@Output()` Angular**: il piano prevedeva `wm-config-detail` con un `@Output() toggled: EventEmitter<ConfigDetailToggleEvent>`. L'implementazione reale dispaccia un `CustomEvent('configDetailSettled')` nativo (`bubbles: true, composed: true`) dal proprio host (`_elRef.nativeElement`), per attraversare il DOM proiettato senza che `wm-home-layer`/`wm-track-properties`/`wm-poi-properties` debbano fare pass-through — questi tre file sono rimasti invariati (i Task 2/3 del piano che li toccavano non sono mai stati eseguiti).
- **Nome evento cambiato in corso d'opera**: da `configDetailToggled` (sincrono al click, come da piano) a `configDetailSettled` — riflette che il dispatch ora avviene solo dopo che il layout si è assestato (debounce + fallback su `transitionend`), non più sincrono al toggle.
- **Timing di assestamento spostato dentro `wm-config-detail` stesso**, non delegato al consumer come da piano originale: `SETTLE_DEBOUNCE_MS` (50ms, resettato ad ogni `transitionend` pertinente) + `SETTLE_FALLBACK_MS` (400ms, per transizioni interrotte da un secondo click) — copre il caso di due wrapper (chiusura + apertura) che transitionano dallo stesso click, aspettando che entrambi abbiano finito prima di considerare il layout stabile.
- **`home-layer.component.ts`/`.html` e `track-properties.component.ts`/`.html` invariati**: nessun pass-through, coerente con il redesign a evento nativo bubbling.

## Cleanup applicati in `wm-skills:wm-review-ticket`

- **Commento "VINCOLO CROSS-REPO" corretto**: descriveva ancora un vincolo verso il `ResizeObserver` di `wm-map-details`, rimosso interamente in webmapp-app nello stesso ciclo (non solo ricalibrato) — il commento ora descrive solo il vincolo interno reale (`SETTLE_DEBOUNCE_MS` << `SETTLE_FALLBACK_MS`).
- **`_onTransitionEnd` ora verifica anche `ev.target`**, non solo `ev.propertyName`: il listener è sull'host component, quindi riceve in bubbling anche i `transitionend` originati da contenuto HTML backend-driven iniettato via `[innerHTML]` (che potrebbe avere una propria transizione con lo stesso nome di proprietà per coincidenza). Filtra ora esplicitamente sul wrapper `.wm-config-detail-content-wrapper`.
- **`showLess()` annulla un toggle in attesa di assestamento** (`_clearSettleTimers()` + `_pendingToggleEvent = null`): prima, se l'utente chiudeva un item e subito dopo cliccava "Mostra meno" prima dell'assestamento, la chiusura implicita dell'item da parte di `showLess()` poteva generare un `transitionend` reale che faceva comunque dispacciare `{opening: true}` per un'apertura non più valida.
- **Il setter `groups` annulla anche `_pendingToggleEvent`** (prima azzerava solo `_openItem` e i timer): stato stale altrimenti possibile quando l'istanza viene riusata per una nuova entità (es. navigazione tra due layer) con un toggle ancora in coda.
- **Test aggiunti**: bubbling reale simulato nell'helper `dispatchTransitionEnd()` (prima dispacciava l'evento direttamente sull'host, ora lo dispaccia su un wrapper figlio con la classe corretta, coerente col nuovo filtro su `target`); nuovi test per `showLess()` e per il setter `groups` che annullano un toggle pendente; nuovo test che verifica l'ignoranza di un `transitionend` pertinente per `propertyName` ma originato da un elemento estraneo.

## Naming

`onConfigDetailToggled` (in `home.component.ts`) rinominato a `onConfigDetailSettled`, per coerenza con l'equivalente in `map-details.component.ts` (webmapp-app) — stesso ruolo (consumer dell'evento), stesso nome.

Dettagli sul bug bloccante trovato e corretto lato webmapp-app (deadlock di `_resizeChain` in `MapDetailsComponent`): vedi `notes.md` del repo principale.
