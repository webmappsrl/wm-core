> Ticket: oc:8127

# Piano implementativo — [posthog] utente online

## Repo coinvolti

| Repo | Percorso locale |
|------|----------------|
| `wm-types` | `core/src/app/shared/wm-types/` |
| `wm-core` | `core/src/app/shared/wm-core/` |

---

## Task 1 — `wm-types`: aggiungere `mode` a `WmPosthogProps`

**File:** `src/posthog.ts`

Aggiungere il campo `mode?: string` nella sezione "Event-specific props" di `WmPosthogProps`,
dopo `layer_label`:

```typescript
  layer_label?: string;
  mode?: string;
```

**Commit:** `feat(oc:8127): add mode field to WmPosthogProps`

---

## Task 2 — `wm-core`: aggiungere heartbeat in `PosthogContextService`

**File:** `projects/wm-core/src/services/posthog-context.service.ts`

### 2a — Import

Aggiungere i nuovi import:

```typescript
import {App} from '@capacitor/app';
import {PluginListenerHandle} from '@capacitor/core';
import {combineLatest, timer} from 'rxjs';
import {filter, takeUntilDestroyed} from '@angular/core/rxjs-interop'; // già presente
```

In pratica:
- Aggiungere `{App}` from `'@capacitor/app'`
- Aggiungere `{PluginListenerHandle}` from `'@capacitor/core'`
- Aggiungere `timer` all'import esistente di `rxjs`: `import {combineLatest, timer} from 'rxjs';`
- Aggiungere `filter` all'import esistente di `rxjs/operators`:
  `import {distinctUntilChanged, filter, map, ...} from 'rxjs/operators';`
  *(verificare l'import esistente e aggiungere solo `filter` se mancante)*

### 2b — Proprietà

Aggiungere due proprietà private alla classe, prima delle proprietà esistenti:

```typescript
private _isAppActive = true;
private _appStateListener: PluginListenerHandle | null = null;
```

### 2c — Costruttore: listener appStateChange

Aggiungere alla fine del costruttore (dopo il `combineLatest` esistente):

```typescript
App.addListener('appStateChange', ({isActive}) => {
  this._isAppActive = isActive;
}).then(handle => {
  this._appStateListener = handle;
});

this._destroyRef.onDestroy(() => {
  this._appStateListener?.remove();
});
```

### 2d — Costruttore: timer heartbeat

Aggiungere subito dopo il blocco del listener:

```typescript
timer(0, 60_000)
  .pipe(
    takeUntilDestroyed(this._destroyRef),
    filter(() => this._isAppActive || this._geolocationSvc.currentMode === 'recording'),
  )
  .subscribe(() => {
    this.capture('userOnline', {mode: this._geolocationSvc.currentMode});
  });
```

> `_geolocationSvc` è già disponibile come lazy getter nel servizio.
> `capture()` è no-op se PostHog non è inizializzato — nessun guard necessario.

**Commit:** `feat(oc:8127): add userOnline heartbeat to PosthogContextService`

---

## Verifica

Dopo i due commit, verificare manualmente:

1. Aprire l'app → attendere ~60s → controllare in PostHog (live events) che arrivi `userOnline`
   con `mode: 'stopped'` e `user_location` se il GPS è attivo
2. Avviare la navigazione → verificare `mode: 'navigation'` al tick successivo
3. Mandare l'app in background (senza recording) → nessun evento per 60s
4. Avviare la registrazione → mandare in background → verificare che il ping continui
5. Tornare in foreground → verificare che il ping riprenda senza burst duplicati
