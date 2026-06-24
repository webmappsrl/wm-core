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

- [ ] Aggiungere in `PosthogContextService` un timer RxJS `timer(0, 60_000)` che ad ogni tick
      invia `this.capture('userOnline', { mode: currentMode })`
- [ ] Il timer usa un flag `_isAppActive` aggiornato da `App.addListener('appStateChange')`:
      il timer gira sempre, ma ogni tick viene filtrato con
      `filter(() => _isAppActive || geolocationSvc.currentMode === 'recording')`
      — nessun restart, nessun burst al ritorno in foreground
- [ ] Aggiungere il campo `mode?: string` a `WmPosthogProps` in `wm-types`
- [ ] Il ping viene inviato anche quando `user_location` è `null` (campo semplicemente assente)
- [ ] Timer gestito con `takeUntilDestroyed(this._destroyRef)` già presente nel servizio
- [ ] Il listener `App.addListener('appStateChange')` viene salvato come `PluginListenerHandle`
      e rimosso esplicitamente nell'`ngOnDestroy` del servizio

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
| `projects/wm-core/src/services/posthog-context.service.ts` | `wm-core` | MODIFICA | Aggiunge timer heartbeat + logica foreground/background |
| `src/posthog.ts` | `wm-types` | MODIFICA | Aggiunge `mode?: string` a `WmPosthogProps` |
