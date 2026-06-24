> Ticket: oc:8127

# Notes — [posthog] utente online

## Deviazioni dal piano

- **Nessun nuovo servizio:** il piano iniziale prevedeva `PosthogOnlineService`. Durante il
  dialogo con il developer si è deciso di aggiungere il timer direttamente in
  `PosthogContextService`, che aveva già tutti i deps necessari (geolocation lazy, destroyRef,
  client). Scelta approvata esplicitamente.

## Bug trovati

Nessuno.

## Decisioni

- **Flag `_isAppActive` invece di restart timer:** il timer gira sempre con
  `filter(() => _isAppActive || mode === 'recording')`. Evita burst di eventi al ritorno in
  foreground che si sarebbero verificati con `timer(0, ...)` riavviato ad ogni foreground entry.
- **`_destroyRef.onDestroy()` per cleanup Capacitor listener:** invece di implementare
  `ngOnDestroy`, si usa il `DestroyRef` già iniettato — coerente con il pattern esistente del
  servizio.

## Follow-up

- Verificare volume eventi PostHog dopo il primo deploy: ~60 eventi/ora per utente attivo.
  Se il piano PostHog viene saturato, aumentare l'intervallo da 60s a 120s o 300s.
