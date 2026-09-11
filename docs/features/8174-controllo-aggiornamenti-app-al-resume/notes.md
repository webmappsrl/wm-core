> Ticket: oc:8174

# Notes — Controllo aggiornamenti app al resume

## Deviazioni dal piano

- **`startForegroundVersionWatcher$` eliminato**: il piano prevedeva un effect separato su `loadConfSuccess`. Durante la review è stato deciso di integrare `startForegroundWatcher` direttamente in `checkAppVersion$` via `concat`, che condivide già `confApp` e rappresenta lo stesso momento semantico di inizializzazione.
- **`Promise.all` scartato**: proposto inizialmente per la chiamata parallela, sostituito con `concat` RxJS puro — più coerente con il resto del codebase NgRx.

## Decisioni

- `concat` con `catchError(() => EMPTY)` indipendente per ogni step: se `startForegroundWatcher` fallisce (es. Capacitor non ancora pronto), `handleAppUpdateFlow` viene comunque eseguito.
- `await remove()` sul handle precedente prima di re-registrare: elimina la finestra in cui due listener sono attivi contemporaneamente su `appStateChange`.
- Guard `isAppMobile` in `startForegroundWatcher`: su browser il metodo esce immediatamente senza registrare listener (l'evento Cordova/Capacitor `appStateChange` non arriva mai su web).

## Bug trovati

- **Doppia invocazione concorrente di `handleAppUpdateFlow`**: due eventi `isActive: true` ravvicinati (es. unlock rapido) potevano creare due chiamate concorrenti che superavano entrambe il check `isThrottled` prima che `markShown` fosse scritto → due toast/modal sovrapposti. Risolto con flag `_isUpdateInProgress` e `.catch(() => {}).finally(...)` nel callback del listener.

## Follow-up

- Nessun test E2E aggiunto: il comportamento dipende dal ciclo di vita nativo Capacitor, non testabile via Cypress in CI.
