> Ticket: oc:8174

# Plan — Controllo aggiornamenti app al resume

## Task 1 — Crea branch in wm-core

```bash
cd core/src/app/shared/wm-core
git checkout develop
git pull origin develop
git checkout -b feature/oc-8174-controllo-aggiornamenti-app-al-resume
```

---

## Task 2 — `update.service.ts`: aggiungi `startForegroundWatcher`

File: `projects/wm-core/src/services/update.service.ts`

### 2a — Aggiungi import `PluginListenerHandle`

```ts
import {PluginListenerHandle} from '@capacitor/core';
```

### 2b — Aggiungi campo privato dopo il costruttore

```ts
private _foregroundListenerHandle: PluginListenerHandle | null = null;
```

### 2c — Aggiungi metodo `startForegroundWatcher`

```ts
async startForegroundWatcher(appConfig: APP): Promise<void> {
  if (!this._deviceService.isAppMobile) {
    return;
  }
  if (this._foregroundListenerHandle) {
    await this._foregroundListenerHandle.remove();
    this._foregroundListenerHandle = null;
  }
  this._foregroundListenerHandle = await App.addListener(
    'appStateChange',
    ({isActive}) => {
      if (isActive) {
        this.handleAppUpdateFlow(appConfig);
      }
    },
  );
}
```

---

## Task 3 — `conf.effects.ts`: aggiungi `startForegroundVersionWatcher$`

File: `projects/wm-core/src/store/conf/conf.effects.ts`

### 3a — Aggiungi import `loadConfSuccess`

`loadConfSuccess` è già importato da `conf.actions` — nessuna modifica necessaria.

Aggiungi import RxJS mancanti se necessario: `from`, `EMPTY`.

```ts
import {of, from, EMPTY} from 'rxjs';
import {catchError, filter, map, switchMap, withLatestFrom, take} from 'rxjs/operators';
```

### 3b — Aggiungi effect dopo `checkAppVersion$`

```ts
startForegroundVersionWatcher$ = createEffect(
  () =>
    this._actions$.pipe(
      ofType(loadConfSuccess),
      switchMap(action =>
        from(this._updateService.startForegroundWatcher(action.conf.APP)).pipe(
          catchError(() => EMPTY),
        ),
      ),
    ),
  {dispatch: false},
);
```

---

## Task 4 — Verifica manuale

- Apri l'app su un device/emulatore nativo (Android o iOS)
- Verifica che al cold start il check avvenga normalmente (comportamento invariato)
- Porta l'app in background, attendi qualche secondo, riporta in foreground
- Verifica che `handleAppUpdateFlow` venga chiamato (se disponibile aggiornamento: toasts/modal; altrimenti nessun popup — normale)
- Verifica che su browser (Chrome DevTools mobile) nessun listener venga registrato

---

## Task 5 — Commit in wm-core

```bash
git add projects/wm-core/src/services/update.service.ts
git add projects/wm-core/src/store/conf/conf.effects.ts
git commit -m "feat(oc:8174): add foreground version check on app resume"
```

---

## Task 6 — Bump submodulo in webmapp-app

```bash
cd ../../../../  # torna in core/
git add src/app/shared/wm-core
git commit -m "feat(oc:8174): bump wm-core — foreground version check on resume"
```

---

## Task 7 — Apri PR in wm-core verso `develop`

```bash
cd src/app/shared/wm-core
git push -u origin feature/oc-8174-controllo-aggiornamenti-app-al-resume
gh pr create \
  --repo webmappsrl/wm-core \
  --base develop \
  --title "feat(oc:8174): add foreground version check on app resume" \
  --body "Closes oc:8174 — registra App.addListener appStateChange in UpdateService e chiama handleAppUpdateFlow ad ogni resume. Effect startForegroundVersionWatcher\$ in conf.effects.ts avvia il watcher dopo loadConfSuccess."
```
