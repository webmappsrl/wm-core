> Ticket: oc:8127

# [posthog] utente online

## Cosa cambia

Viene aggiunto un meccanismo di ping periodico (ogni 60 secondi) che invia l'evento `userOnline`
a PostHog. L'evento trasporta la posizione GPS corrente (se disponibile) e la modalità di
utilizzo (`navigation` / `recording` / `stopped`), oltre a tutti i campi di contesto standard
già iniettati automaticamente da `PosthogContextService` (layer, POI, track).

Il ping gira **sempre quando l'app è in foreground** e continua **anche in background durante la
registrazione traccia**.

## Perché

Il team analytics vuole monitorare quanti utenti sono attivi in real-time. Senza un heartbeat
periodico, PostHog non può distinguere una sessione attiva da una dimenticata aperta.
La posizione è richiesta esplicitamente per abilitare la segmentazione geografica degli utenti
online.

## Requisiti

- [x] Aggiungere `capture('userMoved', { mode })` in `GeolocationService._onLocationUpdate()`
      — si attiva ad ogni aggiornamento di posizione GPS
- [x] Il foreground/background è gestito implicitamente: il GPS watcher si ferma già in
      background (salvo recording), quindi nessuna logica aggiuntiva è necessaria
- [x] Aggiungere il tipo `GeolocationMode = 'navigation' | 'recording' | 'stopped'`
      in `wm-types/user-activity.ts` e il campo `mode?: GeolocationMode` a `WmPosthogProps`
- [x] L'evento viene inviato anche quando `user_location` è `null` (campo assente se GPS off)
- [x] `PosthogContextService._buildContext()` aggiunge `user_location` automaticamente
      a ogni `capture()` se la posizione è disponibile

## Rischi

- **Memory leak:** il timer RxJS deve essere gestito con `takeUntilDestroyed(destroyRef)` o
  equivalente per evitare che rimanga attivo dopo la distruzione del servizio.
- **Doppia istanza:** il servizio deve essere fornito una sola volta (non `providedIn: 'root'`)
  per evitare più timer concorrenti. Va fornito in `WmCoreModule.forRoot()`.
- **Background su iOS:** anche durante la registrazione, iOS può throttlare i timer JS quando
  l'app è in background. Il comportamento dipende dal bridge Capacitor e dal sistema operativo —
  non è garantito che ogni tick arrivi esattamente a 60s. Accettabile per monitoraggio presenza.
- **PostHog non inizializzato / rollback:** se `posthog.enabled = false` nella config (o chiave
  mancante), `capture()` è già no-op — il ping si disabilita senza rilascio di codice.
  Nessuna flag separata necessaria.
- **Volume eventi:** ogni utente attivo genera ~60 eventi/ora. Su volumi alti (migliaia di
  utenti concorrenti) il piano PostHog potrebbe essere saturato o generare costi imprevisti.
  Da verificare con il team analytics prima del deploy in produzione.

## Out of scope

- Modifiche al repo principale `webmapp-app` (nessun file fuori da `wm-core` e `wm-types`)
- Dashboard o query PostHog
- Configurabilità dell'intervallo dall'esterno (hardcoded a 60s)
- Aggiunta di campi extra oltre a `mode` (batteria, rete, ecc.)

## Moduli toccati

| File | Repo | Tipo | Note |
|------|------|------|------|
| `projects/wm-core/src/services/geolocation.service.ts` | `wm-core` | MODIFICA | Aggiunge `capture('userMoved')` in `_onLocationUpdate()` |
| `projects/wm-core/src/services/posthog-context.service.ts` | `wm-core` | MODIFICA | `_buildContext()` arricchisce automaticamente l'evento con GPS e contesto |
| `src/user-activity.ts` | `wm-types` | MODIFICA | Aggiunge tipo `GeolocationMode` |
| `src/posthog.ts` | `wm-types` | MODIFICA | Aggiunge `mode?: GeolocationMode` a `WmPosthogProps` |
