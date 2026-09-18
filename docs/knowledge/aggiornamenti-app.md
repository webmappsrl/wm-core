# Controllo aggiornamenti dell'app

## Come funziona oggi

Al ritorno in foreground l'app verifica se esiste una versione più recente. Il listener Capacitor `appStateChange` vive dentro `UpdateService.startForegroundWatcher()` (`services/update.service.ts`), non in un effect NgRx; l'effect `checkAppVersion$` lo avvia come side-effect la prima volta che l'azione viene dispatchata (`store/conf/conf.effects.ts`).

Su browser la funzione non fa nulla e restituisce silenziosamente: la guardia `isAppMobile` sta nel service.

## Perché così

- **Il listener nel service e non in un effect** (oc:8174): il service resta testabile in isolamento e il ciclo di vita del listener è disaccoppiato dallo store.
- **`concat` invece di `Promise.all`** (oc:8174): le due operazioni — avviare il watcher e gestire il flusso di aggiornamento — sono sequenziali e hanno ciascuna il proprio `catchError(() => EMPTY)`. Se il watcher non si registra, il controllo di versione parte comunque.
- **`await remove()` prima di ri-registrare** (oc:8174): `PluginListenerHandle.remove()` è asincrono. Senza `await` esiste una finestra in cui due listener sono attivi insieme, e `handleAppUpdateFlow` viene chiamato due volte sullo stesso resume.
- **La guardia di piattaforma nel service** (oc:8174): l'effect non sa nulla della piattaforma su cui gira, quindi è il service a incapsulare il controllo.
