> Ticket: oc:8470

# Link da sito non funziona su cell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Regola Webmapp — nessun commit automatico:** i comandi `git commit`/`git add`/`git push` nei passi sotto sono istruzioni testuali per lo sviluppatore/reviewer umano, non azioni da eseguire autonomamente durante l'esecuzione del piano. Il commit avviene solo dopo approvazione esplicita del developer (fase `execution: review-gate` del workflow `wm-plan`).

**Goal:** Un link web con `track`/`poi` (senza path esplicito) deve navigare da Home a Map mostrando il dettaglio; un link con `layer` deve conservare tutti i query param originali nell'URL finale su `/map` (oggi persi per una race condition).

**Architecture:** Fix in due punti indipendenti ma correlati: (1) `UrlHandlerService.initialize()` (wm-core) — riordino per eliminare la race condition sui query param; (2) `HomePage` (repo principale) — estensione del `merge()` reattivo esistente a `currentEcTrack`/`currentEcPoi`, stesso pattern già usato per `currentEcLayer`/`ugcOpened`.

**Tech Stack:** Angular 20, NgRx 20, RxJS, Karma/Jasmine.

**Spec:** `docs/features/8470-link-da-sito-non-funziona-su-cell/overview.md` (in questo stesso repo, wm-core)

## Global Constraints

- Repo coinvolti: **wm-core** (submodule) e **repo principale webmapp-app**. Entrambi i branch partono da `develop` (decisione esplicita del developer).
- Nessun codice relativo a `handleDeepLink()`/`appUrlOpen`/oc:7980 va introdotto — esplorato e scartato, vedi overview.md.
- Non toccare `ShareService`, `tabs-routing.module.ts`, `setTrack()`/`setLayer()`/`setPoi()` — comportamento invariato.
- Non introdurre una guardia `onRecord`/`drawOpened` in `HomePage` — deciso esplicitamente fuori scope (vedi overview.md).
- Nessun testo i18n nuovo.

---

### Task 1: Fix race condition in `UrlHandlerService.initialize()` (wm-core)

**Files:**
- Modify: `projects/wm-core/src/services/url-handler.service.ts` (metodo `initialize()`, righe 76-98 attuali)
- Test: `projects/wm-core/src/services/url-handler.service.spec.ts` (nuovo file — non esiste ancora su questo branch)

**Interfaces:**
- Nessuna interfaccia pubblica cambia — `initialize()` resta `(): void`, chiamato dal costruttore del servizio.

- [ ] **Step 1: Scrivi un test che fallisce per la race condition**

Crea `projects/wm-core/src/services/url-handler.service.spec.ts` con questo contenuto:

```ts
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {BehaviorSubject, of} from 'rxjs';

import {UrlHandlerService} from './url-handler.service';
import {DeviceService} from './device.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';

describe('UrlHandlerService', () => {
  let service: UrlHandlerService;
  let queryParams$: BehaviorSubject<any>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.resetTestingModule();

    queryParams$ = new BehaviorSubject<any>({});
    const routeStub: Partial<ActivatedRoute> = {
      queryParams: queryParams$.asObservable(),
    };
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate'], {url: '/map'});
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));
    dispatchSpy = storeSpy.dispatch as jasmine.Spy;
    const deviceSvcStub: Partial<DeviceService> = {
      get isBrowser() {
        return true;
      },
    } as any;
    const posthogClientSpy = jasmine.createSpyObj('WmPosthogClient', ['capture']);

    TestBed.configureTestingModule({
      providers: [
        UrlHandlerService,
        {provide: ActivatedRoute, useValue: routeStub},
        {provide: Router, useValue: routerSpy},
        {provide: Store, useValue: storeSpy},
        {provide: DeviceService, useValue: deviceSvcStub},
        {provide: POSTHOG_CLIENT, useValue: posthogClientSpy},
      ],
    });

    service = TestBed.inject(UrlHandlerService);
  });

  it('aggiorna _currentQueryParams$ prima di dispatchare le action, non dopo', done => {
    // skip(1) in initialize() richiede una prima emissione "vuota" prima di quella osservata
    queryParams$.next({});

    dispatchSpy.and.callFake(() => {
      // Nel momento in cui avviene il PRIMO dispatch, getCurrentQueryParams() deve
      // già riflettere i nuovi query param — se _currentQueryParams$.next(params)
      // viene ancora eseguito DOPO i dispatch, questo fallisce (restituisce {}).
      expect(service.getCurrentQueryParams()).toEqual({track: '55821', layer: '164'});
      done();
    });

    queryParams$.next({track: '55821', layer: '164'});
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core
npx ng test wm-core --include='**/url-handler.service.spec.ts' --watch=false
```

Atteso: FAIL — `getCurrentQueryParams()` restituisce `{}` invece di `{track: '55821', layer: '164'}`, perché nel codice attuale `_currentQueryParams$.next(params)` è l'ultima istruzione del subscribe, eseguita dopo tutti i `dispatch()`.

- [ ] **Step 3: Sposta `_currentQueryParams$.next(params)` in testa al blocco**

In `url-handler.service.ts`, nel metodo `initialize()`, sposta la riga `this._currentQueryParams$.next(params);` dalla penultima posizione (subito prima di `this._mobileTrackUrlChange(params);`) alla **prima** riga dentro il callback del `subscribe`, prima di qualsiasi `this._store.dispatch(...)`. Il metodo risultante:

```ts
  initialize(): void {
    this._route.queryParams.pipe(skip(1), debounceTime(100)).subscribe(params => {
      this._currentQueryParams$.next(params);

      this._store.dispatch(currentEcLayerId({currentEcLayerId: params.layer ?? null}));
      this._store.dispatch(currentEcTrackId({currentEcTrackId: params.track ?? null}));
      this._store.dispatch(currentEcPoiId({currentEcPoiId: params.poi ?? null}));
      this._store.dispatch(
        currentEcRelatedPoiId({currentRelatedPoiId: params.ec_related_poi ?? null}),
      );
      this._store.dispatch(currentUgcTrackId({currentUgcTrackId: params.ugc_track ?? null}));
      this._store.dispatch(currentUgcPoiId({currentUgcPoiId: params.ugc_poi ?? null}));
      this._store.dispatch(
        currentEcImageGalleryIndex({
          currentEcImageGalleryIndex: params.gallery_index ? +params.gallery_index : null,
        }),
      );
      this._store.dispatch(inputTyped({inputTyped: this._decodeQueryParam(params.search)}));
      this._checkIfUgcIsOpened(params);

      // Traccia gli eventi PostHog per i cambiamenti di URL sulla app mobile
      this._mobileTrackUrlChange(params);
    });
  }
```

Nessun altro cambiamento al metodo — stesse dispatch, stesso ordine relativo tra loro, solo la posizione di `_currentQueryParams$.next(params)`.

- [ ] **Step 4: Esegui il test e verifica che passi**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core
npx ng test wm-core --include='**/url-handler.service.spec.ts' --watch=false
```

Atteso: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core/src/app/shared/wm-core
git add projects/wm-core/src/services/url-handler.service.ts projects/wm-core/src/services/url-handler.service.spec.ts
git commit -m "fix(oc:8470): aggiorna currentQueryParams prima dei dispatch in initialize()"
```

---

### Task 2: Estendi `HomePage` a navigare su Map anche per `track`/`poi` (repo principale)

**Files:**
- Modify: `core/src/app/pages/home/home.page.ts`
- Test: `core/src/app/pages/home/home.page.spec.ts` (crea se non esiste già; se esiste, aggiungi i test a quello esistente)

**Interfaces:**
- Consumes: selettori `currentEcTrack`, `currentEcPoi` da `@wm-core/store/features/ec/ec.selector` (già esistenti, nessuna modifica).
- Produces: nessuna nuova interfaccia pubblica.

- [ ] **Step 1: Verifica se esiste già `home.page.spec.ts`**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
find src/app/pages/home -maxdepth 1 -name "home.page.spec.ts"
```

Se il comando non stampa nulla, il file non esiste — crealo da zero con il contenuto del Step 2. Se esiste, leggilo e aggiungi i 2 test del Step 2 al `describe` esistente, senza duplicare setup già presente.

- [ ] **Step 2: Scrivi i test che falliscono**

Contenuto (se il file è nuovo) o test da aggiungere (se già esiste):

```ts
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {Platform} from '@ionic/angular';
import {BehaviorSubject, of} from 'rxjs';

import {HomePage} from './home.page';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {currentEcLayer, ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {currentEcTrack, currentEcPoi} from '@wm-core/store/features/ec/ec.selector';

describe('HomePage', () => {
  let urlHandlerSvcSpy: jasmine.SpyObj<UrlHandlerService>;
  let selectorSubjects: Map<any, BehaviorSubject<any>>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    selectorSubjects = new Map([
      [currentEcLayer, new BehaviorSubject<any>(null)],
      [ugcOpened, new BehaviorSubject<any>(false)],
      [currentEcTrack, new BehaviorSubject<any>(null)],
      [currentEcPoi, new BehaviorSubject<any>(null)],
    ]);

    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.callFake((selector: any) => {
      const subject = selectorSubjects.get(selector);
      return subject ? subject.asObservable() : of(null);
    });

    urlHandlerSvcSpy = jasmine.createSpyObj<UrlHandlerService>('UrlHandlerService', [
      'changeURL',
    ]);
    const platformStub: Partial<Platform> = {
      backButton: {subscribeWithPriority: () => ({unsubscribe: () => {}})} as any,
    };

    TestBed.configureTestingModule({
      providers: [
        HomePage,
        {provide: Store, useValue: storeSpy},
        {provide: Platform, useValue: platformStub},
        {provide: UrlHandlerService, useValue: urlHandlerSvcSpy},
      ],
    });

    TestBed.inject(HomePage);
  });

  it('naviga su map quando currentEcTrack diventa non-null', () => {
    selectorSubjects.get(currentEcTrack).next({properties: {id: 123}});

    expect(urlHandlerSvcSpy.changeURL).toHaveBeenCalledWith('map');
  });

  it('naviga su map quando currentEcPoi diventa non-null', () => {
    selectorSubjects.get(currentEcPoi).next({properties: {id: 456}});

    expect(urlHandlerSvcSpy.changeURL).toHaveBeenCalledWith('map');
  });
});
```

- [ ] **Step 3: Esegui i test e verifica che i 2 nuovi falliscano**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
npx ng test --include='**/home.page.spec.ts' --watch=false
```

Atteso: FAIL — `HomePage` oggi non seleziona `currentEcTrack`/`currentEcPoi`, quindi `changeURL` non viene mai chiamato in questi due scenari.

- [ ] **Step 4: Estendi `home.page.ts`**

Aggiungi l'import subito dopo la riga `import {UrlHandlerService} from '@wm-core/services/url-handler.service';`:

```ts
import {currentEcTrack, currentEcPoi} from '@wm-core/store/features/ec/ec.selector';
```

Aggiungi due property subito dopo `private _currentLayer$ = this._store.select(currentEcLayer);`:

```ts
  private _currentTrack$ = this._store.select(currentEcTrack);
  private _currentPoi$ = this._store.select(currentEcPoi);
```

Estendi il `merge(...)` nel costruttore da:
```ts
    merge(
      this._currentLayer$.pipe(filter(l => l != null)),
      this._ugcOpened$.pipe(filter(ugcOpened => ugcOpened != null && ugcOpened)),
    ).subscribe(_ => {
      this._urlHandlerSvc.changeURL('map');
    });
```
a:
```ts
    merge(
      this._currentLayer$.pipe(filter(l => l != null)),
      this._currentTrack$.pipe(filter(t => t != null)),
      this._currentPoi$.pipe(filter(p => p != null)),
      this._ugcOpened$.pipe(filter(ugcOpened => ugcOpened != null && ugcOpened)),
    ).subscribe(_ => {
      this._urlHandlerSvc.changeURL('map');
    });
```

- [ ] **Step 5: Esegui i test e verifica che passino**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
npx ng test --include='**/home.page.spec.ts' --watch=false
```

Atteso: PASS (i 2 nuovi test, più eventuali test preesistenti se il file esisteva già).

- [ ] **Step 6: Verifica manuale in dev server**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
npm start
```

Apri nel browser `http://localhost:4200/?track=<id-traccia-valida>&search=borello` (sostituisci `<id-traccia-valida>` con un id reale, es. quello usato nel ticket: `89812`, se accessibile dall'ambiente di test). Atteso: la pagina passa da `/home` a `/map` con il dettaglio della traccia visibile, e l'URL finale conserva `track`/`search`. Ripeti con `?poi=<id-poi-valida>` e con `?track=<id>&layer=<id-layer>` (per verificare che con il fix di Task 1 i query param non vengano più persi).

- [ ] **Step 7: Commit**

```bash
cd /Users/peco/Documents/Apps/webmapp-app
git add core/src/app/pages/home/home.page.ts core/src/app/pages/home/home.page.spec.ts core/tsconfig.spec.json core/angular.json
git commit -m "fix(oc:8470): naviga su map anche per track/poi da Home (non solo layer)"
```

---

### Task 3: `MapDetailsComponent` deve aprire il pannello anche se il feature è già selezionato al mount (repo principale)

Aggiunto dopo un test manuale del developer: `http://localhost:4200/?poi=36961` naviga su `/map` (grazie a Task 1+2) e il POI viene evidenziato sulla mappa, ma il **pannello di dettaglio non si apre**.

Causa: `MapDetailsComponent.ngAfterViewInit()` sottoscrive `featureOpened$` con `skip(1)`, assumendo che il componente sia sempre montato *prima* che un feature (poi/track) venga selezionato (vero per il flusso "click su risultato di ricerca", dove il pannello è già montato quando l'utente seleziona qualcosa). Con un deep-link iniziale, invece, `currentEcPoiId` viene dispatchato mentre l'utente è ancora su Home — `featureOpened` diventa `true` **prima** che `MapDetailsComponent` esista. Quando il componente monta (dopo la navigazione a `/map`), il primo valore emesso da `featureOpened$` è già `true`, ma `skip(1)` lo scarta — nessuna transizione successiva arriva mai, quindi `setMapDetailsStatus({status: 'open'})` non viene mai dispatchato.

**Files:**
- Modify: `core/src/app/pages/map/map-details/map-details.component.ts` (metodo `ngAfterViewInit()`)
- Test: `core/src/app/pages/map/map-details/map-details.component.spec.ts` (nuovo file — non esiste ancora)

**Interfaces:**
- Nessuna interfaccia pubblica cambia.

- [ ] **Step 1: Verifica se il path del componente è già incluso nella test discovery**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
grep -n "app/pages/map" tsconfig.spec.json angular.json
```

Se non trovi `src/app/pages/map` (o un path che lo copra) in nessuno dei due file, aggiungilo con lo stesso pattern già usato per `src/app/pages/home` (Task 2): `"src/app/pages/map/map-details/**/*.spec.ts"` in `tsconfig.spec.json` → `include`, e `"src/app/pages/map/map-details"` in `angular.json` → `architect.test.options.include`.

- [ ] **Step 2: Scrivi il test che fallisce**

Crea `core/src/app/pages/map/map-details/map-details.component.spec.ts`:

```ts
import {Store} from '@ngrx/store';
import {BehaviorSubject, of} from 'rxjs';

import {MapDetailsComponent} from './map-details.component';
import {featureOpened} from '@wm-core/store/features/features.selector';
import {setMapDetailsStatus} from '@wm-core/store/user-activity/user-activity.action';

describe('MapDetailsComponent', () => {
  let component: MapDetailsComponent;
  let storeSpy: jasmine.SpyObj<Store>;
  let featureOpened$: BehaviorSubject<boolean>;

  beforeEach(() => {
    // true già al mount: simula il caso reale (feature selezionato PRIMA che il
    // componente esista, es. da un deep-link/query param iniziale — oc:8470)
    featureOpened$ = new BehaviorSubject<boolean>(true);

    storeSpy = jasmine.createSpyObj<Store>('Store', ['select', 'dispatch']);
    storeSpy.select.and.callFake((selector: any) => {
      if (selector === featureOpened) return featureOpened$.asObservable();
      return of('background');
    });

    component = new MapDetailsComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      storeSpy,
    );
    spyOn(component as any, 'setAnimations');
    spyOn(component as any, '_setGesture');
  });

  it('apre il pannello se il feature è già selezionato al momento del mount (oc:8470)', () => {
    component.ngAfterViewInit();

    expect(storeSpy.dispatch).toHaveBeenCalledWith(setMapDetailsStatus({status: 'open'}));
  });

  it('non apre il pannello se nessun feature è selezionato al mount', () => {
    featureOpened$.next(false);

    component.ngAfterViewInit();

    expect(storeSpy.dispatch).not.toHaveBeenCalledWith(setMapDetailsStatus({status: 'open'}));
  });

  it('apre il pannello su una transizione a true dopo il mount (comportamento preesistente)', () => {
    featureOpened$.next(false);
    component.ngAfterViewInit();
    storeSpy.dispatch.calls.reset();

    featureOpened$.next(true);

    expect(storeSpy.dispatch).toHaveBeenCalledWith(setMapDetailsStatus({status: 'open'}));
  });
});
```

- [ ] **Step 3: Esegui il test e verifica che il primo caso fallisca**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
npx ng test --include='**/map-details.component.spec.ts' --watch=false
```

Atteso: FAIL sul primo test ("apre il pannello se il feature è già selezionato al momento del mount") — con `skip(1)`, il valore iniziale `true` viene scartato, `dispatch` non viene mai chiamato con `setMapDetailsStatus({status: 'open'})`. Gli altri due test passano già con il codice attuale.

- [ ] **Step 4: Rimuovi `skip(1)`**

In `map-details.component.ts`, dentro `ngAfterViewInit()`, sostituisci:
```ts
    this._featureOpened$.pipe(skip(1)).subscribe(featureopened => {
      if (featureopened) {
        this._store.dispatch(setMapDetailsStatus({status: 'open'}));
      }
    });
```
con:
```ts
    // Niente skip(1): se il feature (poi/track) è già "aperto" nello store al momento
    // del mount — es. selezionato da un deep-link/query-param iniziale, prima che questo
    // componente esistesse — il pannello deve aprirsi comunque, non solo su una
    // transizione false->true osservata *dopo* la subscription (oc:8470).
    this._featureOpened$.subscribe(featureopened => {
      if (featureopened) {
        this._store.dispatch(setMapDetailsStatus({status: 'open'}));
      }
    });
```

Se dopo questa modifica l'import `skip` da `rxjs/operators` non è più usato altrove nel file, rimuovi anche quell'import (verifica con `grep -n "skip(" map-details.component.ts` prima di toglierlo).

- [ ] **Step 5: Esegui il test e verifica che tutti passino**

```bash
cd /Users/peco/Documents/Apps/webmapp-app/core
npx ng test --include='**/map-details.component.spec.ts' --watch=false
```

Atteso: PASS su tutti e 3 i test.

- [ ] **Step 6: Verifica manuale in dev server**

Apri `http://localhost:4200/?poi=36961` (o un id POI valido nell'ambiente di test). Atteso: naviga su `/map`, il POI è evidenziato sulla mappa **e** il pannello di dettaglio è aperto.

- [ ] **Step 7: Commit**

```bash
cd /Users/peco/Documents/Apps/webmapp-app
git add core/src/app/pages/map/map-details/map-details.component.ts core/src/app/pages/map/map-details/map-details.component.spec.ts
git commit -m "fix(oc:8470): apri il pannello dettaglio se il feature è già selezionato al mount"
```

