> Ticket: oc:8115

# Notes — oc:8115 PostHog Context Enrichment

## Deviazioni dal piano

### D1 — Navigation events in `geobox-map.component.ts` invece di `GeolocationService`

**Piano:** catturare `navigationStarted`/`navigationStopped` in `GeolocationService.onModeChange$`.

**Implementato:** eventi catturati nel metodo `navigation()` di `geobox-map.component.ts`, sulla base del toggle `focus` (focus=true → `navigationStarted`, focus=false → `navigationStopped`).

**Motivazione:** la navigazione intesa nel ticket è il "centra su posizione" (focus sulla posizione GPS), non una modalità di navigazione GPS distinta. Il metodo `navigation()` in `geobox-map` è il punto di ingresso esatto di questa azione utente. L'approccio via `onModeChange$` avrebbe catturato transizioni di modalità non correlate.

---

### D2 — Rinominazione `ec_poi_id` / `ec_track_id` → `poi_id` / `track_id`

**Piano (overview.md):** proprietà `ec_poi_id` e `ec_track_id`.

**Implementato:** `poi_id` e `track_id` (senza prefisso `ec_`).

**Motivazione:** le chiavi UGC usano già il prefisso (`ugc_poi_id`, `ugc_track_id`). Le chiavi EC senza prefisso sono più leggibili nei dashboard PostHog e simmetriche con la convenzione esistente.

---

### D3 — Modifica `wm-types` (inizialmente "Out of scope")

**Piano (overview.md):** `wm-types` indicato come out of scope.

**Implementato:** `WmPosthogProps` in `wm-types/src/posthog.ts` aggiornato da `Record<string, any>` a interfaccia con proprietà tipate note (context props + event-specific props).

**Motivazione:** tipare le proprietà in `wm-types` (livello base della dipendenza) garantisce type safety su tutti i call site senza duplicare la definizione. Il rischio era zero — modifica additiva, retrocompatibile via index signature poi rimossa a favore di proprietà esplicite.

---

### D4 — Recording events in `GeolocationService` (conforme al piano)

Nessuna deviazione. `recordingStarted`/`recordingStopped` sono catturati su `onModeChange.pipe(pairwise())` come pianificato.

---

## Fix post-review

### F1 — `implements WmPosthogClient` aggiunto

`PosthogContextService` dichiarava implicitamente la stessa firma di `WmPosthogClient` senza dichiararla. Aggiunto `implements WmPosthogClient` per garantire che TypeScript segnali eventuali drift futuri dell'interfaccia.

### F2 — Subscription NgRx con `takeUntilDestroyed`

La subscription `combineLatest` nel costruttore non aveva cleanup. Aggiunto `DestroyRef` e `.pipe(takeUntilDestroyed(this._destroyRef))`.

### F3 — Proprietà GPS collassate in `user_location` (oggetto)

Invece di proprietà flat `user_lat`, `user_lng`, `user_accuracy`, si usa un singolo oggetto `user_location: {latitude, longitude, accuracy?}`. PostHog serializza gli oggetti come JSON; i campi sono accessibili con dot notation nei filtri del dashboard. Scelta privilegiata per contesto descrittivo, non per segmentazione per coorte.
