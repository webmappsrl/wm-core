> Ticket: oc:8115

# PostHog — arricchimento eventi con contesto standard

## Cosa cambia

Ogni evento PostHog catturato dall'app riceve automaticamente un set di proprietà di contesto
standard (posizione utente, layer/POI/track selezionati) senza che i siti di chiamata debbano
fare nulla di diverso. Vengono inoltre aggiunti quattro nuovi eventi per tracciare l'inizio e la
fine delle sessioni di navigazione e registrazione traccia.

## Perché

Il team analytics non può correlare gli eventi (es. `filterUsed`, `trackDownloaded`) al contesto
geografico e di selezione in cui sono avvenuti. L'obiettivo è arricchire ogni evento con le
informazioni disponibili (posizione GPS, layer/track/POI attivo) per abilitare analisi di funnel
e segmentazione geografica.

## Requisiti

- [ ] Creare `PosthogContextService` in wm-core che implementa `WmPosthogClient` e funge da
      wrapper trasparente intorno a `PosthogCapacitorClient`
- [ ] Il wrapper legge in modo sincrono (snapshot da subscription) le seguenti proprietà di
      contesto e le aggiunge a ogni `capture()`:
  - `user_lat`, `user_lng` — da `GeolocationService.location.latitude/longitude`
  - `user_accuracy` — da `GeolocationService.location.accuracy` (opzionale)
  - `layer_id` — da selettore `currentEcLayer` → `layer.id` (se presente)
  - `ec_poi_id` — da selettore `currentEcPoiId` (se presente)
  - `ugc_poi_id` — da selettore `currentUgcPoiId` (se presente)
  - `ec_track_id` — da selettore `currentEcTrack` → `properties.id` (se presente)
  - `ugc_track_id` — da selettore `currentUgcTrackId` (se presente)
- [ ] Solo i campi con valore definito e non-null vengono inclusi (nessun `null` esplicito)
- [ ] L'arricchimento si applica a **tutti** gli eventi, nuovi e preesistenti, indiscriminatamente
- [ ] Sostituire il provider `POSTHOG_CLIENT` in `wm-core.module.ts` con `PosthogContextService`
      (mantenendo `PosthogCapacitorClient` come implementazione interna)
- [ ] Aggiungere in `GeolocationService` una subscription a `onModeChange$` che cattura i
      quattro nuovi eventi:
  - `navigationStarted` — alla transizione verso `'navigation'`
  - `navigationStopped` — alla transizione da `'navigation'` verso `'stopped'`
  - `recordingStarted` — alla transizione verso `'recording'`
  - `recordingStopped` — alla transizione da `'recording'` verso `'stopped'`

## Rischi

- **Snapshot stale:** se la subscription che mantiene il snapshot del contesto è lenta o
  deferred, un evento catturato subito dopo un cambio di stato potrebbe ricevere proprietà
  obsolete. Mitigazione: usare `BehaviorSubject` o snapshot sincrono con `Store.select` +
  `take(1)` + caching locale.
- **Circolarità di iniezione:** `PosthogContextService` inietterà `PosthogCapacitorClient`
  direttamente (non via token `POSTHOG_CLIENT`) per evitare dipendenza circolare con il provider
  che punta al wrapper stesso.
- **onModeChange$ subscription leak:** la subscription in `GeolocationService` deve essere
  gestita con `takeUntil` o `ngOnDestroy` per evitare memory leak. Essendo un servizio root,
  il ciclo di vita è quello dell'app — il rischio è basso ma va gestito con `pairwise()` per
  distinguere le transizioni.
- **Dati sensibili (GDPR):** `user_lat/lng` sono dati di geolocalizzazione. Il consenso
  dell'utente è già gestito a monte dalla configurazione PostHog — questo servizio non introduce
  nuovi obblighi, ma va documentato nel DPA se non già presente.

## Out of scope

- Modifiche ai siti di chiamata `capture()` esistenti (il wrapper è trasparente)
- Aggiunta di nuovi eventi oltre ai quattro di navigazione/recording
- Tracking del pulsante favourite
- Modifiche al repo principale (nessun file fuori da wm-core è toccato)
- Modifiche a `wm-types` (i tipi esistenti `WmPosthogProps = Record<string, any>` sono
  sufficienti)

## Moduli toccati

Tutti i file sono in `core/src/app/shared/wm-core/`:

| File | Tipo | Note |
|------|------|------|
| `projects/wm-core/src/services/posthog-context.service.ts` | **NUOVO** | Wrapper `WmPosthogClient` con arricchimento contesto |
| `projects/wm-core/src/services/geolocation.service.ts` | MODIFICA | Subscription `onModeChange$` per i 4 nuovi eventi |
| `projects/wm-core/src/wm-core.module.ts` | MODIFICA | `POSTHOG_CLIENT` → `useExisting: PosthogContextService` |
