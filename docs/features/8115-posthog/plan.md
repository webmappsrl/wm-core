> Ticket: oc:8115

# Piano implementativo — PostHog context enrichment

Tutti i file sono in `wm-core` (`core/src/app/shared/wm-core/`).  
Commit convention: `feat(oc:8115): ...`

---

## Task 1 — Crea branch feature in wm-core

```bash
cd core/src/app/shared/wm-core
git checkout -b feature/oc-8115-posthog
```

---

## Task 2 — Crea `PosthogContextService`

**File:** `projects/wm-core/src/services/posthog-context.service.ts` (NUOVO)

Il servizio implementa `WmPosthogClient` e funge da wrapper trasparente intorno a
`PosthogCapacitorClient`. Mantiene un snapshot sincrono del contesto NgRx tramite subscription,
che viene aggiunto a ogni `capture()`.

**Nota circolarità:** `PosthogContextService` ha bisogno di `GeolocationService.location`,
ma `GeolocationService` inietta `POSTHOG_CLIENT` (che punta a `PosthogContextService`).
Per rompere la circolarità, `PosthogContextService` inietta `Injector` e ottiene
`GeolocationService` in modo lazy al primo utilizzo — pattern Angular standard per
dipendenze circolari.

**Struttura del servizio:**

```typescript
@Injectable()
export class PosthogContextService implements WmPosthogClient {
  private _contextSnapshot: WmPosthogProps = {};
  private _geolocationSvc: GeolocationService | null = null;

  constructor(
    private _client: PosthogCapacitorClient,  // diretto, non via token
    private _store: Store,
    private _injector: Injector,
  ) {
    // Subscription selettori NgRx → snapshot sincrono
    combineLatest([
      this._store.select(currentEcLayer),
      this._store.select(currentEcPoiId),
      this._store.select(currentUgcPoiId),
      this._store.select(currentEcTrack),
      this._store.select(currentUgcTrackId),
    ]).subscribe(([layer, ecPoiId, ugcPoiId, ecTrack, ugcTrackId]) => {
      const snap: WmPosthogProps = {};
      if (layer?.id != null) snap['layer_id'] = `${layer.id}`;
      if (ecPoiId != null)   snap['ec_poi_id'] = `${ecPoiId}`;
      if (ugcPoiId != null)  snap['ugc_poi_id'] = `${ugcPoiId}`;
      if (ecTrack?.properties?.id != null) snap['ec_track_id'] = `${ecTrack.properties.id}`;
      if (ugcTrackId != null) snap['ugc_track_id'] = `${ugcTrackId}`;
      this._contextSnapshot = snap;
    });
  }

  private get _geo(): GeolocationService {
    if (!this._geolocationSvc) {
      this._geolocationSvc = this._injector.get(GeolocationService);
    }
    return this._geolocationSvc;
  }

  private _buildContext(): WmPosthogProps {
    const ctx = {...this._contextSnapshot};
    const loc = this._geo.location;
    if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
      ctx['user_lat'] = loc.latitude;
      ctx['user_lng'] = loc.longitude;
      if (Number.isFinite(loc.accuracy)) ctx['user_accuracy'] = loc.accuracy;
    }
    return ctx;
  }

  // Le props evento-specifiche sovrascrivono quelle di contesto (caller wins)
  capture(event: string, props: WmPosthogProps = {}): Promise<void> {
    return this._client.capture(event, {...this._buildContext(), ...props});
  }

  identify(distinctId: string, props?: WmPosthogProps): Promise<void> {
    return this._client.identify(distinctId, props);
  }

  initAndRegister(props: WmPosthogProps, options?: WmPosthogInitOptions): Promise<void> {
    return this._client.initAndRegister(props, options);
  }

  reset(): Promise<void> {
    return this._client.reset();
  }
}
```

**Selettori da importare:**
- `currentEcLayer` da `@wm-core/store/user-activity/user-activity.selector`
- `currentEcPoiId`, `currentEcTrack` da `@wm-core/store/features/ec/ec.selector`
- `currentUgcPoiId`, `currentUgcTrackId` da `@wm-core/store/features/ugc/ugc.selector`

---

## Task 3 — Aggiorna `wm-core.module.ts`

**File:** `projects/wm-core/src/wm-core.module.ts` (MODIFICA)

Nel metodo `forRoot()`, sostituire il provider `POSTHOG_CLIENT` e aggiungere
`PosthogContextService`:

```typescript
// PRIMA:
PosthogCapacitorClient,
{provide: POSTHOG_CLIENT, useExisting: PosthogCapacitorClient},

// DOPO:
PosthogCapacitorClient,
PosthogContextService,
{provide: POSTHOG_CLIENT, useExisting: PosthogContextService},
```

Aggiungere l'import di `PosthogContextService` in testa al file.

---

## Task 4 — Aggiorna `GeolocationService`

**File:** `projects/wm-core/src/services/geolocation.service.ts` (MODIFICA)

**4a — Aggiunge dipendenza opzionale PostHog al costruttore:**

```typescript
constructor(
  private _deviceService: DeviceService,
  private _store: Store,
  @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient: WmPosthogClient | null,
) { ... }
```

Aggiungere gli import necessari: `Optional`, `Inject` da `@angular/core`;
`POSTHOG_CLIENT` da `@wm-core/store/conf/conf.token`;
`WmPosthogClient` da `@wm-types/posthog`.

**4b — Subscription `onModeChange` con `pairwise()` nel costruttore:**

Aggiungere dopo il listener `App.addListener`:

```typescript
this.onModeChange
  .pipe(pairwise())
  .subscribe(([prev, curr]) => {
    if (curr === 'navigation') {
      this._posthogClient?.capture('navigationStarted');
    } else if (prev === 'navigation' && curr === 'stopped') {
      this._posthogClient?.capture('navigationStopped');
    }
    if (curr === 'recording') {
      this._posthogClient?.capture('recordingStarted');
    } else if (prev === 'recording' && curr === 'stopped') {
      this._posthogClient?.capture('recordingStopped');
    }
  });
```

Aggiungere import di `pairwise` da `rxjs/operators`.

**Nota:** `onModeChange` è un `BehaviorSubject` con valore iniziale `'stopped'`.
`pairwise()` aspetta 2 emissioni prima di emettere la prima coppia, quindi la
transizione iniziale `undefined → 'stopped'` non viene mai catturata — comportamento
corretto.

---

## Task 5 — Commit in wm-core

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/services/posthog-context.service.ts \
        projects/wm-core/src/services/geolocation.service.ts \
        projects/wm-core/src/wm-core.module.ts \
        docs/features/8115-posthog/
git commit -m "feat(oc:8115): add PosthogContextService wrapper with standard context enrichment"
```

---

## Task 6 — Aggiorna puntatore submodule nel repo principale

```bash
cd /Users/peco/Documents/Apps/webmapp-app
git add core/src/app/shared/wm-core
git commit -m "feat(oc:8115): bump wm-core to posthog context service"
```

---

## Task 7 — Apri PR

```bash
# In wm-core
cd core/src/app/shared/wm-core
git push -u origin feature/oc-8115-posthog

# Nel repo principale
cd /Users/peco/Documents/Apps/webmapp-app
git checkout -b feature/oc-8115-posthog
git push -u origin feature/oc-8115-posthog
gh pr create --base develop --title "feat(oc:8115): PostHog context enrichment" \
  --body "..."
```
