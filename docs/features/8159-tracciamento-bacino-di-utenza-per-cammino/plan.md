> Ticket: oc:8159

# PostHog user_id in PosthogContextService — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `PosthogContextService` deve popolare automaticamente `user_id` (nuovo campo di `WmPosthogProps`, wm-types) su ogni evento PostHog capturato, leggendo l'id dell'utente autenticato dallo store NgRx `auth`; per utenti anonimi il campo resta assente.

**Architecture:** Estensione del `combineLatest` esistente in `PosthogContextService` con un ulteriore selettore (`user` da `auth.selectors.ts`), seguendo lo stesso pattern reattivo snapshot già usato per `layer_id`/`track_id`/ecc. — nessuna nuova sottoscrizione, nessun nuovo servizio.

**Tech Stack:** Angular 20, NgRx 20, Jasmine/Karma (`@ngrx/store/testing` per il mock dello store).

## Global Constraints

- Dipendenza: richiede che `wm-types` esponga `WmPosthogProps.user_id?: number` (vedi `wm-types/docs/features/8159-tracciamento-bacino-di-utenza-per-cammino/plan.md`, Task 1) — se quel piano non è ancora eseguito, TypeScript segnalerà `user_id` come proprietà sconosciuta.
- NIENTE `identify()` in questo ciclo — solo un commento `TODO(oc:8159)` che segnali la possibilità futura.
- NESSUNA modifica a `wm-package`/`AnalyticsService` — il dato non viene consumato da nessuna query in questo ciclo.
- NESSUN gate di consenso privacy (`hasPrivacyAgree`) per questo campo — coerente con l'assenza di gate su tutto il resto di PostHog oggi.
- NESSUN flag `OPTIONS` di gating per-shard — il campo è sempre attivo su tutte le istanze.
- Scope volutamente ampio: `user_id` va nel contesto condiviso (`_buildContext()`), quindi si applica a **tutti** gli eventi capturati da `capture()`, non solo `userMoved`.
- Il campo deve riflettere reattivamente lo stato di login istante per istante — nessuna gestione speciale per il rehydrate asincrono dello store `auth` all'avvio, né per un login a metà di una traccia GPS: è il comportamento naturale del pattern `combineLatest`/snapshot già esistente.
- Commit convention: `feat(oc:8159): ...`. Non eseguire il commit automaticamente — è un'istruzione testuale per lo sviluppatore.

---

### Task 1: Test di `PosthogContextService` per `user_id`

**Files:**
- Create: `projects/wm-core/src/services/posthog-context.service.spec.ts`
- Test: lo stesso file sopra (nessun file di test separato — il servizio non ha spec preesistente)

**Interfaces:**
- Consumes: `PosthogContextService` (esistente, `projects/wm-core/src/services/posthog-context.service.ts`), `PosthogCapacitorClient` (esistente), selettore `user` da `@wm-core/store/auth/auth.selectors` (esistente, riga 14: `export const user = createSelector(selectAuthState, state => state.user)`), `IUser` da `@wm-core/store/auth/auth.model` (esistente: `{id: number; access_token: string; ...}`)
- Produces: nessuna nuova interfaccia — solo copertura di test per il comportamento implementato in Task 2

- [ ] **Step 1: Scrivere il file di test**

Creare `projects/wm-core/src/services/posthog-context.service.spec.ts`:

```typescript
import {TestBed} from '@angular/core/testing';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {currentEcPoiId, currentEcTrack} from '@wm-core/store/features/ec/ec.selector';
import {currentUgcPoiId, currentUgcTrackId} from '@wm-core/store/features/ugc/ugc.selector';
import {currentEcLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {user} from '@wm-core/store/auth/auth.selectors';
import {IUser} from '@wm-core/store/auth/auth.model';
import {PosthogContextService} from './posthog-context.service';
import {PosthogCapacitorClient} from './posthog-capacitor.client';

describe('PosthogContextService — user_id', () => {
  let service: PosthogContextService;
  let store: MockStore;
  let clientSpy: jasmine.SpyObj<PosthogCapacitorClient>;

  const mockUser: IUser = {id: 42, access_token: 'test-token'};

  beforeEach(() => {
    clientSpy = jasmine.createSpyObj('PosthogCapacitorClient', [
      'capture',
      'identify',
      'initAndRegister',
      'reset',
    ]);
    clientSpy.capture.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        PosthogContextService,
        {provide: PosthogCapacitorClient, useValue: clientSpy},
        provideMockStore({
          selectors: [
            {selector: currentEcLayer, value: null},
            {selector: currentEcPoiId, value: null},
            {selector: currentUgcPoiId, value: null},
            {selector: currentEcTrack, value: null},
            {selector: currentUgcTrackId, value: null},
            {selector: user, value: undefined},
          ],
        }),
      ],
    });

    store = TestBed.inject(MockStore);
    service = TestBed.inject(PosthogContextService);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('omette user_id quando nessun utente è loggato', async () => {
    await service.capture('testEvent');

    const props = clientSpy.capture.calls.mostRecent().args[1];
    expect(props.user_id).toBeUndefined();
  });

  it('include user_id quando l\'utente è loggato', async () => {
    store.overrideSelector(user, mockUser);
    store.refreshState();

    await service.capture('testEvent');

    const props = clientSpy.capture.calls.mostRecent().args[1];
    expect(props.user_id).toBe(42);
  });

  it('aggiorna user_id reattivamente al login e al logout, senza reinizializzare il servizio', async () => {
    await service.capture('beforeLogin');
    expect(clientSpy.capture.calls.mostRecent().args[1].user_id).toBeUndefined();

    store.overrideSelector(user, mockUser);
    store.refreshState();
    await service.capture('afterLogin');
    expect(clientSpy.capture.calls.mostRecent().args[1].user_id).toBe(42);

    store.overrideSelector(user, undefined);
    store.refreshState();
    await service.capture('afterLogout');
    expect(clientSpy.capture.calls.mostRecent().args[1].user_id).toBeUndefined();
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core && npx ng test wm-core --include='projects/wm-core/src/services/posthog-context.service.spec.ts' --watch=false`

Expected: il primo test ("omette user_id...") passa già banalmente (il campo non esiste ancora). Il secondo e il terzo test FALLISCONO con `expected undefined to be 42` — perché il selettore `user` non è ancora cablato in `PosthogContextService`.

---

### Task 2: Implementare il popolamento di `user_id`

**Files:**
- Modify: `projects/wm-core/src/services/posthog-context.service.ts:1-49`

**Interfaces:**
- Consumes: `WmPosthogProps.user_id?: number` (wm-types, deve già esistere — vedi Global Constraints), selettore `user` (`@wm-core/store/auth/auth.selectors`)
- Produces: `PosthogContextService.capture()` ora include `user_id` nel context quando l'utente è loggato — nessun cambiamento di firma pubblica

- [ ] **Step 1: Aggiornare gli import**

In `posthog-context.service.ts`, aggiungere l'import del selettore `user` insieme agli altri import da `@wm-core/store/*` (dopo la riga 6, `import {currentEcLayer} from '@wm-core/store/user-activity/user-activity.selector';`):

```typescript
import {user} from '@wm-core/store/auth/auth.selectors';
```

- [ ] **Step 2: Aggiungere il selettore al `combineLatest` e popolare `user_id` nello snapshot**

Sostituire il blocco del costruttore (righe 31-47) con:

```typescript
    combineLatest([
      this._store.select(currentEcLayer),
      this._store.select(currentEcPoiId),
      this._store.select(currentUgcPoiId),
      this._store.select(currentEcTrack),
      this._store.select(currentUgcTrackId),
      this._store.select(user),
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([layer, ecPoiId, ugcPoiId, ecTrack, ugcTrackId, authUser]) => {
        const snap: WmPosthogProps = {};
        if (layer?.id != null) snap['layer_id'] = `${layer.id}`;
        if (ecPoiId != null && ecPoiId !== 0) snap['poi_id'] = `${ecPoiId}`;
        if (ugcPoiId != null) snap['ugc_poi_id'] = `${ugcPoiId}`;
        if (ecTrack?.properties?.id != null) snap['track_id'] = `${ecTrack.properties.id}`;
        if (ugcTrackId != null) snap['ugc_track_id'] = `${ugcTrackId}`;
        // TODO(oc:8159): valutare identify(`${authUser.id}`) per il merge storico
        // cross-device/reinstall in PostHog, invece della sola prop user_id qui sotto.
        if (authUser?.id != null) snap['user_id'] = authUser.id;
        this._contextSnapshot = snap;
      });
```

Nessun'altra parte del file cambia: `_buildContext()`, `capture()`, `identify()`, `initAndRegister()`, `reset()` restano invariati — `user_id` arriva a tutti gli eventi tramite lo stesso merge `{...this._buildContext(), ...props}` già esistente in `capture()` (riga 69).

- [ ] **Step 3: Eseguire i test e verificare che passino**

Run: `cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core && npx ng test wm-core --include='projects/wm-core/src/services/posthog-context.service.spec.ts' --watch=false`

Expected: tutti e 3 i test passano.

- [ ] **Step 4: Eseguire l'intera suite di wm-core per escludere regressioni**

Run: `cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core && npm run test:single`

Expected: nessuna suite preesistente si rompe (in particolare `posthog-capacitor.client.spec.ts`, che non viene toccato da questa modifica).

- [ ] **Step 5: Verifica manuale in app (checklist, a complemento del test automatico)**

Con l'app in dev (`ng serve` dal repo principale) e le PostHog dev-tools del browser aperte (o un breakpoint su `PosthogCapacitorClient.capture`):
1. Da utente anonimo, generare un evento qualsiasi (es. aprire un layer) → verificare che l'evento capturato NON contenga `user_id`.
2. Effettuare il login → generare un nuovo evento → verificare che ora contenga `user_id` con il valore corretto (`IUser.id` dell'account loggato).
3. Effettuare il logout → generare un nuovo evento → verificare che `user_id` torni ad essere assente.

- [ ] **Step 6: Commit**

```bash
git add projects/wm-core/src/services/posthog-context.service.ts projects/wm-core/src/services/posthog-context.service.spec.ts
git commit -m "feat(oc:8159): populate user_id in PosthogContextService from auth store"
```

---

## Self-Review

- **Copertura overview** (`wm-core/docs/features/8159-tracciamento-bacino-di-utenza-per-cammino/overview.md`):
  - "aggiungere il selettore `user` al `combineLatest`... `user_id` solo quando `user?.id != null`" → Task 2, Step 2.
  - "il campo deve aggiornarsi reattivamente al login/logout" → coperto dal pattern esistente (nessuna modifica extra necessaria) e verificato esplicitamente dal terzo test in Task 1 e dallo Step 5 di Task 2.
  - "commento TODO per identify() futuro" → Task 2, Step 2 (commento nel codice).
- **Nessun placeholder**: ogni step mostra il codice/comando reale, nessun "gestire edge case" generico.
- **Coerenza di tipo**: `user_id` è sempre un `number` (da `IUser.id: number`, mai castato a stringa) — coerente con la definizione `user_id?: number` del piano wm-types, a differenza degli altri campi id del file (`layer_id`, `track_id`, ecc.) che sono stringhe: scelta consapevole, il tipo del campo è deciso dal piano wm-types e questo piano lo rispetta senza reintrodurre una conversione a stringa non richiesta.
