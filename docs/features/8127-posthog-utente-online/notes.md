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

- Verificare volume eventi PostHog dopo il primo deploy: il numero di `locationUpdate` dipende
  dalla frequenza di aggiornamento GPS (distanceFilter 10m per navigazione/recording, 100m in
  standby). Su percorsi attivi può essere significativo — monitorare il piano PostHog.

## Revisione post-implementazione

- **Cambio trigger:** dopo revisione, il trigger è stato cambiato da timer fisso (60s) a ogni
  aggiornamento di posizione (`onLocationChange$`). Più fedele alla semantica "posizione utente"
  e più semplice: spariscono timer, flag `_isAppActive`, `App.addListener` e tutta la logica
  foreground/background (il GPS watcher gestisce già questo nativamente).
- **Cambio nome evento:** da `userOnline` a `locationUpdate` — più preciso rispetto al trigger
  reale (aggiornamento posizione, non semplice presenza).
