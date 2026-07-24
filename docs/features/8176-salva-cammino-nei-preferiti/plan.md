# Salva cammino nei preferiti — wm-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Ticket: oc:8176

**Goal:** Cuoricino toggle preferiti su `wm-layer-box` e `wm-home-layer`, gated da login + `OPTIONS.show_favorites`, con cache condivisa e ottimistica lato client.

**Architecture:** Nuovo `LayerFavoriteService` (providedIn root) con cache in-memory (`BehaviorSubject<ILAYER[]>`), aggiornata otticamente dal valore `favorite: bool` ritornato dal toggle (nessun refetch completo), azzerata al logout. Consumato sia dal cuoricino sia — cross-repo — dal tab "Cammini" in `webmapp-app` (stesso servizio importato via `@wm-core/...`).

**Tech Stack:** Angular 20 (standalone: false, NgModule esistenti), NgRx 20, Karma/Jasmine.

## Global Constraints

- `ILAYER.id` è tipizzato **`string`**, non `number` — tutti i confronti tra ID devono essere per uguaglianza di stringa, mai coercizione numerica (rischio di bug silenzioso identificato in Fase: challenge se un lato normalizza a stringa e l'altro no)
- Nessun test con `TestBed` sui componenti che usano `wmtrans`/`LangService` (crash noto `NG0201` su `APP_TRANSLATION`, vedi CLAUDE.md oc:8023) — usare istanziazione diretta della classe con spy, stesso pattern di `ugc-track-properties.component.spec.ts`. I servizi puri (`LayerFavoriteService`) non hanno questo problema e usano `TestBed` normale
- Ogni tap sul cuoricino deve chiamare `$event.stopPropagation()` prima del toggle (la card `wm-layer-box` ha già un `(click)` di navigazione sull'intero box)
- Il cuoricino è visibile solo se `isLogged && confOPTIONSShowFavorites` — nessun prompt di login per utenti anonimi (nascosto del tutto)
- Icone: classi CSS globali già esistenti `webmapp-icon-heart`/`webmapp-icon-heart-outline` (icon font `webmapp-icons`, caricato globalmente dall'app host — utilizzabile da wm-core grazie a `ViewEncapsulation.None`), stesso pattern di `map-track-card.component.html` nel repo principale
- Area di tap del cuoricino minima 44×44px, spaziatura ≥8px dagli altri overlay della card

---

### Task 1: Flag `show_favorites` — tipo condiviso e selettore

**Files:**
- Modify: `wm-types/src/config.ts` (submodule separato — interfaccia `OPTIONS`)
- Modify: `projects/wm-core/src/store/conf/conf.selector.ts`
- Test: `projects/wm-core/src/store/conf/conf.selector.spec.ts` (nuovo, se non esiste — verifica solo il nuovo selettore, non l'intero file)

**Interfaces:**
- Consumes: nessuno
- Produces: `confOPTIONSShowFavorites: MemoizedSelector<..., boolean>`, usato dai Task 3 e 4

- [ ] **Step 1: Scrivi il test per il nuovo selettore**

```typescript
import {confOPTIONSShowFavorites} from './conf.selector';

describe('confOPTIONSShowFavorites', () => {
  it('restituisce true quando OPTIONS.show_favorites è true', () => {
    const state = {conf: {OPTIONS: {show_favorites: true}}} as any;
    expect(confOPTIONSShowFavorites.projector(state.conf.OPTIONS)).toBe(true);
  });

  it('restituisce false quando OPTIONS.show_favorites è assente', () => {
    const state = {conf: {OPTIONS: {}}} as any;
    expect(confOPTIONSShowFavorites.projector(state.conf.OPTIONS)).toBe(false);
  });
});
```

- [ ] **Step 2: Esegui il test per verificare che fallisca**

Run: `ng test wm-core --include='**/conf.selector.spec.ts'`
Expected: FAIL — `confOPTIONSShowFavorites` non esportato da `conf.selector.ts`

- [ ] **Step 3: Aggiungi `show_favorites` all'interfaccia `OPTIONS` (submodule wm-types)**

In `wm-types/src/config.ts`, dentro `export interface OPTIONS { ... }`, aggiungi in ordine alfabetico:

```typescript
  show_favorites?: boolean;
```

- [ ] **Step 4: Aggiungi il selettore in `conf.selector.ts`**

Subito dopo `export const confOPTIONSShowMediaName = createSelector(confOPTIONS, state => state.showMediaName);`:

```typescript
export const confOPTIONSShowFavorites = createSelector(
  confOPTIONS,
  state => state.show_favorites ?? false,
);
```

- [ ] **Step 5: Esegui il test per verificare che passi**

Run: `ng test wm-core --include='**/conf.selector.spec.ts'`
Expected: PASS

- [ ] **Step 6: Commit (due repo separati)**

```bash
cd core/src/app/shared/wm-types
git add src/config.ts
git commit -m "feat(oc:8176): add show_favorites to OPTIONS interface"

cd ../wm-core
git add projects/wm-core/src/store/conf/conf.selector.ts projects/wm-core/src/store/conf/conf.selector.spec.ts
git commit -m "feat(oc:8176): add confOPTIONSShowFavorites selector"
```

---

### Task 2: `LayerFavoriteService` — cache preferiti layer

**Files:**
- Create: `projects/wm-core/src/services/layer-favorite.service.ts`
- Test: `projects/wm-core/src/services/layer-favorite.service.spec.ts` (nuovo)

**Interfaces:**
- Consumes: `EnvironmentService.origin` (già esistente), `isLogged` selector (`@wm-core/store/auth/auth.selectors`, già esistente), `ILAYER` (wm-core `types/config.ts`)
- Produces: `LayerFavoriteService.getFavorites(): Promise<ILAYER[]>`, `.favorites$: Observable<ILAYER[]>` (stream reattivo, riflette gli aggiornamenti ottimistici), `.isFavorite$(layerId: string): Observable<boolean>`, `.toggle(layer: ILAYER): Promise<boolean>` — usati dai Task 3 e 4, e dal tab "Cammini" in webmapp-app (import diretto da `@wm-core/services/layer-favorite.service`): webmapp-app chiama `getFavorites()` una volta per popolare la cache e si sottoscrive a `favorites$` per la lista reattiva (aggiornata in automatico se l'utente rimuove un preferito tramite il cuoricino dentro la stessa lista)

- [ ] **Step 1: Scrivi i test del servizio**

```typescript
import {HttpTestingController, HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {of, BehaviorSubject} from 'rxjs';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {ILAYER} from '@wm-core/types/config';

import {LayerFavoriteService} from './layer-favorite.service';

describe('LayerFavoriteService', () => {
  let service: LayerFavoriteService;
  let httpMock: HttpTestingController;
  let isLoggedSubject: BehaviorSubject<boolean>;

  const layer1: ILAYER = {id: '1', title: 'Layer 1'} as any;
  const layer2: ILAYER = {id: '2', title: 'Layer 2'} as any;

  beforeEach(() => {
    isLoggedSubject = new BehaviorSubject<boolean>(true);
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.callFake((selector: any) =>
      selector === isLogged ? isLoggedSubject.asObservable() : of(null),
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LayerFavoriteService,
        {provide: Store, useValue: storeSpy},
        {provide: EnvironmentService, useValue: {origin: 'https://example.test'}},
      ],
    });

    service = TestBed.inject(LayerFavoriteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches favorites once and caches them', async () => {
    const promise1 = service.getFavorites();
    const promise2 = service.getFavorites();

    const req = httpMock.expectOne('https://example.test/api/layer/favorite/list');
    req.flush({favorites: [layer1]});

    expect(await promise1).toEqual([layer1]);
    expect(await promise2).toEqual([layer1]);
    httpMock.expectNone('https://example.test/api/layer/favorite/list');
  });

  it('reports isFavorite$ true only for a cached layer id (string comparison)', async () => {
    const promise = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: [layer1]});
    await promise;

    let result: boolean;
    service.isFavorite$('1').subscribe(v => (result = v));
    expect(result).toBe(true);

    service.isFavorite$('2').subscribe(v => (result = v));
    expect(result).toBe(false);
  });

  it('optimistically adds the layer to the cache when toggle returns favorite: true', async () => {
    const promise = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: []});
    await promise;

    const togglePromise = service.toggle(layer2);
    httpMock.expectOne('https://example.test/api/layer/favorite/toggle/2').flush({favorite: true});
    const favorite = await togglePromise;

    expect(favorite).toBe(true);
    let result: boolean;
    service.isFavorite$('2').subscribe(v => (result = v));
    expect(result).toBe(true);
  });

  it('optimistically removes the layer from the cache when toggle returns favorite: false', async () => {
    const promise = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: [layer1]});
    await promise;

    const togglePromise = service.toggle(layer1);
    httpMock.expectOne('https://example.test/api/layer/favorite/toggle/1').flush({favorite: false});
    const favorite = await togglePromise;

    expect(favorite).toBe(false);
    let result: boolean;
    service.isFavorite$('1').subscribe(v => (result = v));
    expect(result).toBe(false);
  });

  it('emits the updated list reactively via favorites$ after a toggle', async () => {
    const promise = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: []});
    await promise;

    const emitted: ILAYER[][] = [];
    service.favorites$.subscribe(v => emitted.push(v));

    const togglePromise = service.toggle(layer1);
    httpMock.expectOne('https://example.test/api/layer/favorite/toggle/1').flush({favorite: true});
    await togglePromise;

    expect(emitted[emitted.length - 1]).toEqual([layer1]);
  });

  it('clears the cache when the user logs out', async () => {
    const promise = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: [layer1]});
    await promise;

    isLoggedSubject.next(false);

    const promiseAfterLogout = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: []});
    expect(await promiseAfterLogout).toEqual([]);
  });
});
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `ng test wm-core --include='**/layer-favorite.service.spec.ts'`
Expected: FAIL — modulo `./layer-favorite.service` non trovato

- [ ] **Step 3: Crea il servizio**

```typescript
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {ILAYER} from '@wm-core/types/config';
import {BehaviorSubject, Observable, lastValueFrom} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LayerFavoriteService {
  private _favorites$ = new BehaviorSubject<ILAYER[] | null>(null);
  private _pending = new Set<string>();

  constructor(
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
    private _store: Store,
  ) {
    this._store
      .select(isLogged)
      .pipe(distinctUntilChanged())
      .subscribe(logged => {
        if (!logged) {
          this._favorites$.next(null);
        }
      });
  }

  /**
   * Emette la lista corrente (aggiornata otticamente ad ogni toggle) — usato da
   * webmapp-app per il tab "Cammini" reattivo. Richiede che `getFavorites()` sia stato
   * chiamato almeno una volta per popolare la cache iniziale.
   */
  get favorites$(): Observable<ILAYER[]> {
    return this._favorites$.pipe(map(favorites => favorites ?? []));
  }

  async getFavorites(): Promise<ILAYER[]> {
    if (this._favorites$.value == null) {
      const res = await lastValueFrom(
        this._http.get<{favorites: ILAYER[]}>(
          `${this._environmentSvc.origin}/api/layer/favorite/list`,
        ),
      );
      this._favorites$.next(res.favorites ?? []);
    }

    return this._favorites$.value ?? [];
  }

  isFavorite$(layerId: string): Observable<boolean> {
    return this._favorites$.pipe(map(favorites => !!favorites?.some(l => l.id === layerId)));
  }

  isPending(layerId: string): boolean {
    return this._pending.has(layerId);
  }

  async toggle(layer: ILAYER): Promise<boolean> {
    const layerId = layer.id;
    if (this._pending.has(layerId)) {
      return this._favorites$.value?.some(l => l.id === layerId) ?? false;
    }

    this._pending.add(layerId);
    try {
      const res = await lastValueFrom(
        this._http.post<{favorite: boolean}>(
          `${this._environmentSvc.origin}/api/layer/favorite/toggle/${layerId}`,
          null,
        ),
      );
      const current = this._favorites$.value ?? [];
      this._favorites$.next(
        res.favorite
          ? [...current.filter(l => l.id !== layerId), layer]
          : current.filter(l => l.id !== layerId),
      );

      return res.favorite;
    } finally {
      this._pending.delete(layerId);
    }
  }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `ng test wm-core --include='**/layer-favorite.service.spec.ts'`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add projects/wm-core/src/services/layer-favorite.service.ts projects/wm-core/src/services/layer-favorite.service.spec.ts
git commit -m "feat(oc:8176): add LayerFavoriteService with optimistic cache"
```

---

### Task 3: Cuoricino in `wm-layer-box`

**Files:**
- Modify: `projects/wm-core/src/box/layer-box/layer-box.component.ts`
- Modify: `projects/wm-core/src/box/layer-box/layer-box.component.html`
- Modify: `projects/wm-core/src/box/layer-box/layer-box.component.scss`
- Modify: `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts`
- Test: `projects/wm-core/src/box/layer-box/layer-box.component.spec.ts` (nuovo — istanza plain TS, stesso pattern di `ugc-track-properties.component.spec.ts`)

**Interfaces:**
- Consumes: `LayerFavoriteService` (Task 2), `confOPTIONSShowFavorites` (Task 1), `isLogged` (`@wm-core/store/auth/auth.selectors`, già esistente)
- Produces: nessuno consumato da altri task di questo repo

- [ ] **Step 1: Scrivi i test del comportamento toggle**

```typescript
import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {ILAYER} from '@wm-core/types/config';

import {LayerBoxComponent} from './layer-box.component';
import {LayerFavoriteService} from '../../services/layer-favorite.service';

describe('LayerBoxComponent — preferiti (oc:8176)', () => {
  const fakeLayer: ILAYER = {id: '42', title: 'Cammino di prova'} as any;

  let component: LayerBoxComponent;
  let favoriteSvcSpy: jasmine.SpyObj<LayerFavoriteService>;
  let posthogSpy: jasmine.SpyObj<{capture: Function}>;
  let toastCtrlSpy: jasmine.SpyObj<{create: Function}>;
  let toastPresentSpy: jasmine.Spy;

  function createComponent(): LayerBoxComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(true));
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    langSvcSpy.onLangChange = of() as any;
    favoriteSvcSpy = jasmine.createSpyObj<LayerFavoriteService>('LayerFavoriteService', [
      'isFavorite$',
      'toggle',
      'isPending',
    ]);
    favoriteSvcSpy.isFavorite$.and.returnValue(of(false));
    favoriteSvcSpy.toggle.and.resolveTo(true);
    posthogSpy = jasmine.createSpyObj('WmPosthogClient', ['capture']);
    toastPresentSpy = jasmine.createSpy('present').and.resolveTo();
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo({present: toastPresentSpy});

    const instance = new LayerBoxComponent(
      langSvcSpy,
      {markForCheck: () => {}} as any,
      storeSpy,
      favoriteSvcSpy,
      toastCtrlSpy as any,
      posthogSpy as any,
    );
    instance.data = {layer: fakeLayer, title: 'Cammino di prova'} as any;

    return instance;
  }

  beforeEach(() => {
    component = createComponent();
  });

  it('chiama stopPropagation e il toggle sul tap del cuoricino', async () => {
    const event = jasmine.createSpyObj('Event', ['stopPropagation']);

    await component.onFavoriteClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(favoriteSvcSpy.toggle).toHaveBeenCalledWith(fakeLayer);
  });

  it('emette layerFavorited con layer_id esplicito solo quando il toggle aggiunge ai preferiti', async () => {
    favoriteSvcSpy.toggle.and.resolveTo(true);
    const event = jasmine.createSpyObj('Event', ['stopPropagation']);

    await component.onFavoriteClick(event);

    expect(posthogSpy.capture).toHaveBeenCalledWith(
      'layerFavorited',
      jasmine.objectContaining({layer_id: '42'}),
    );
  });

  it('non emette layerFavorited quando il toggle rimuove dai preferiti', async () => {
    favoriteSvcSpy.toggle.and.resolveTo(false);
    const event = jasmine.createSpyObj('Event', ['stopPropagation']);

    await component.onFavoriteClick(event);

    expect(posthogSpy.capture).not.toHaveBeenCalledWith('layerFavorited', jasmine.anything());
  });

  it('non richiama toggle se una richiesta per lo stesso layer è già in corso', async () => {
    favoriteSvcSpy.isPending.and.returnValue(true);
    const event = jasmine.createSpyObj('Event', ['stopPropagation']);

    await component.onFavoriteClick(event);

    expect(favoriteSvcSpy.toggle).not.toHaveBeenCalled();
  });

  it('mostra un toast di errore se il toggle fallisce e resetta isTogglingFavorite', async () => {
    favoriteSvcSpy.toggle.and.rejectWith(new Error('network error'));
    const event = jasmine.createSpyObj('Event', ['stopPropagation']);

    await component.onFavoriteClick(event);

    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(toastPresentSpy).toHaveBeenCalled();
    expect(component.isTogglingFavorite).toBeFalse();
  });
});
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `ng test wm-core --include='**/layer-box.component.spec.ts'`
Expected: FAIL — `onFavoriteClick` non esiste, costruttore con 5 argomenti non corrisponde

- [ ] **Step 3: Aggiorna `layer-box.component.ts`**

Sostituisci il contenuto del file con:

```typescript
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  Optional,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {BaseBoxComponent} from '../box';
import {ILAYERBOX} from '../../types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {ToastController} from '@ionic/angular';

@Component({
  standalone: false,
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends BaseBoxComponent<ILAYERBOX> {
  @Input() showBadge = true;
  @Input() useTotal = false;

  isFavorite$: Observable<boolean>;
  isTogglingFavorite = false;

  constructor(
    langSvc: LangService,
    cdr: ChangeDetectorRef,
    store: Store,
    private _layerFavoriteSvc: LayerFavoriteService,
    private _toastCtrl: ToastController,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    super(langSvc, cdr, store);
  }

  ngOnChanges(): void {
    if (this.data?.layer?.id != null) {
      this.isFavorite$ = this._layerFavoriteSvc.isFavorite$(this.data.layer.id);
    }
  }

  async onFavoriteClick(event: Event): Promise<void> {
    event.stopPropagation();
    const layer = this.data?.layer;
    if (!layer?.id || this._layerFavoriteSvc.isPending(layer.id)) {
      return;
    }

    this.isTogglingFavorite = true;
    this._cdr.markForCheck();
    try {
      const favorite = await this._layerFavoriteSvc.toggle(layer);
      if (favorite && this._posthogClient) {
        this._posthogClient.capture('layerFavorited', {layer_id: layer.id});
      }
    } catch {
      const toast = await this._toastCtrl.create({
        message: 'Impossibile aggiornare i preferiti, riprova',
        duration: 2000,
      });
      await toast.present();
    } finally {
      this.isTogglingFavorite = false;
      this._cdr.markForCheck();
    }
  }

  onClick(): void {
    if (this._posthogClient && this.data?.layer) {
      const layerId = `${this.data.layer.id}`;
      const rawTitle = this.data.layer.title ?? this.data.title ?? '';
      const layerName =
        typeof rawTitle === 'string'
          ? rawTitle
          : rawTitle.it ?? Object.values(rawTitle).find(v => v) ?? '';
      this._posthogClient.capture('layerOpened', {
        layer_name: layerName,
        layer_label: `${layerId} - ${layerName}`,
      });
    }
    this.clickEVT.emit();
  }
}
```

`LayerBoxComponent` deve implementare `OnChanges` (import `OnChanges` da `@angular/core` e aggiungilo alla lista di import e a `implements OnChanges` sulla classe) — necessario perché `data` è un `@Input()` che può essere riassegnato quando il componente è riusato in un `*ngFor` (home-result, home-landing).

- [ ] **Step 4: Aggiorna `layer-box.component.html`**

Aggiungi il cuoricino subito dopo il blocco `wm-img` (prima di `wm-box-title`), gated su login + flag, con `*ngIf` combinato:

```html
<div class="wm-box" (click)="onClick()" *ngIf="data && data.layer">
  <div
    class="color"
    [ngStyle]="{'background-color':data.layer.style?.color?data.layer.style.color:''}"
  ></div>
  <div
    class="wm-box-icon"
    *ngIf="data.icon as icon"
    appBuildSvg
    [svg]="icon"
    [color]="data.color"
  ></div>
  <wm-img
    class="webmapp-card-big-image-container wm-result-img"
    [src]="data.layer.feature_image"
    size="225x100"
  >
    <wm-img
      *ngIf="data.layer.logo_image | hasLogo"
      class="wm-layer-box-logo-overlay"
      [src]="data.layer.logo_image"
    ></wm-img>
  </wm-img>
  <i
    *ngIf="(isFavorite$|async) !== null"
    class="wm-layer-box-favorite"
    [class.wm-layer-box-favorite--disabled]="isTogglingFavorite"
    [attr.aria-label]="(isFavorite$|async) ? ('Rimuovi dai preferiti'|wmtrans) : ('Aggiungi ai preferiti'|wmtrans)"
    [ngClass]="{
      'webmapp-icon-heart': isFavorite$|async,
      'webmapp-icon-heart-outline': !(isFavorite$|async)
    }"
    (click)="onFavoriteClick($event)"
  ></i>
  <div class="wm-box-title">{{data.layer.title??data.title | wmtrans}}</div>
  <wm-layer-features-counter-badge
    *ngIf="showBadge"
    [layerId]="data.layer?.id"
    [useTotal]="useTotal"
  ></wm-layer-features-counter-badge>
  <ng-content></ng-content>
</div>
```

Il cuoricino compare solo quando `isFavorite$` ha già emesso un valore (`!== null`) — il template stesso non controlla `isLogged`/`confOPTIONSShowFavorites` direttamente: quel gating è responsabilità del componente contenitore (home-result/home-landing) che decide se istanziare `wm-layer-box` con la injection del servizio attiva. Per semplicità e coerenza con `wm-ugc-box` (che nasconde l'intero pulsante upload via `*ngIf`, non l'intero box), aggiungi in `layer-box.component.ts` un getter combinato che il template userà al posto del solo `isFavorite$`:

Sostituisci il metodo `ngOnChanges` con:

```typescript
  showFavoriteHeart$: Observable<boolean>;

  ngOnChanges(): void {
    if (this.data?.layer?.id != null) {
      this.isFavorite$ = this._layerFavoriteSvc.isFavorite$(this.data.layer.id);
      this.showFavoriteHeart$ = combineLatest([
        this._store.select(isLogged),
        this._store.select(confOPTIONSShowFavorites),
      ]).pipe(map(([logged, enabled]) => logged && enabled));
    }
  }
```

Aggiungi gli import necessari in cima al file: `import {combineLatest, Observable} from 'rxjs';`, `import {map} from 'rxjs/operators';`, `import {isLogged} from '@wm-core/store/auth/auth.selectors';`, `import {confOPTIONSShowFavorites} from '@wm-core/store/conf/conf.selector';`.

E nel template, avvolgi il tag `<i>` del cuoricino con `*ngIf="showFavoriteHeart$|async"` al posto di `*ngIf="(isFavorite$|async) !== null"`.

- [ ] **Step 5: Aggiungi lo stile del cuoricino**

In `layer-box.component.scss`, dentro `.wm-box`, subito dopo il blocco `wm-img.wm-layer-box-logo-overlay`:

```scss
    .wm-layer-box-favorite {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.85);
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.35);
      z-index: 3;
      cursor: pointer;
      font-size: 22px;

      &--disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    }
```

`z-index: 3` (superiore al `.color` e a `.wm-box-icon`, entrambi a `z-index: 2` o inferiore) per restare sempre cliccabile sopra gli altri overlay. Il modificatore `--disabled` (bindato su `isTogglingFavorite`) rende visivamente non interagibile il cuoricino mentre la richiesta di toggle è in corso.

- [ ] **Step 6: Aggiungi le chiavi i18n**

In ciascuno dei 7 file (`projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts`), aggiungi le due chiavi (valore italiano come testo sorgente in tutti i file, da tradurre nelle rispettive lingue):

```typescript
  'Aggiungi ai preferiti': 'Aggiungi ai preferiti', // it
  'Rimuovi dai preferiti': 'Rimuovi dai preferiti', // it
```

(Per `en.ts`: `'Aggiungi ai preferiti': 'Add to favorites', 'Rimuovi dai preferiti': 'Remove from favorites',` — e analogamente per `de`, `es`, `fr`, `pr`, `sq`, seguendo lo stesso schema chiave-italiana → valore-tradotto già usato per le altre chiavi in questi file.)

- [ ] **Step 7: Esegui i test per verificare che passino**

Run: `ng test wm-core --include='**/layer-box.component.spec.ts'`
Expected: PASS (5 test)

- [ ] **Step 8: Commit**

```bash
git add projects/wm-core/src/box/layer-box/ projects/wm-core/src/localization/i18n/
git commit -m "feat(oc:8176): add favorite heart toggle to wm-layer-box"
```

---

### Task 4: Cuoricino in `wm-home-layer`

**Files:**
- Modify: `projects/wm-core/src/home/home-layer/home-layer.component.ts`
- Modify: `projects/wm-core/src/home/home-layer/home-layer.component.html`
- Modify: `projects/wm-core/src/home/home-layer/home-layer.component.scss`
- Test: `projects/wm-core/src/home/home-layer/home-layer.component.spec.ts` (nuovo, stesso pattern plain-TS)

**Interfaces:**
- Consumes: `LayerFavoriteService` (Task 2), `confOPTIONSShowFavorites` (Task 1), `isLogged`

- [ ] **Step 1: Scrivi il test del comportamento toggle**

```typescript
import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {ILAYER} from '@wm-core/types/config';

import {WmHomeLayerComponent} from './home-layer.component';
import {LayerFavoriteService} from '../../services/layer-favorite.service';

describe('WmHomeLayerComponent — preferiti (oc:8176)', () => {
  const fakeLayer: ILAYER = {id: '7', title: 'Cammino dettaglio'} as any;

  function createComponent(): WmHomeLayerComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(fakeLayer));
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    langSvcSpy.onLangChange = of() as any;
    const favoriteSvcSpy = jasmine.createSpyObj<LayerFavoriteService>('LayerFavoriteService', [
      'isFavorite$',
      'toggle',
      'isPending',
    ]);
    favoriteSvcSpy.isFavorite$.and.returnValue(of(false));
    favoriteSvcSpy.toggle.and.resolveTo(true);
    const toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo({present: jasmine.createSpy('present').and.resolveTo()});

    const instance = new WmHomeLayerComponent(
      storeSpy,
      langSvcSpy,
      {markForCheck: () => {}} as any,
      favoriteSvcSpy,
      toastCtrlSpy as any,
    );
    (instance as any)._favoriteSvcSpy = favoriteSvcSpy;
    return instance;
  }

  it('chiama toggle con il layer corrente e stopPropagation sul tap', async () => {
    const component = createComponent();
    const favoriteSvcSpy = (component as any)._favoriteSvcSpy as jasmine.SpyObj<LayerFavoriteService>;
    const event = jasmine.createSpyObj('Event', ['stopPropagation']);

    await component.onFavoriteClick(event, fakeLayer);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(favoriteSvcSpy.toggle).toHaveBeenCalledWith(fakeLayer);
  });
});
```

- [ ] **Step 2: Esegui il test per verificare che fallisca**

Run: `ng test wm-core --include='**/home-layer.component.spec.ts'`
Expected: FAIL — `onFavoriteClick` non esiste, costruttore non corrisponde

- [ ] **Step 3: Aggiorna `home-layer.component.ts`**

```typescript
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {ecLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {confOPTIONSShowFavorites} from '@wm-core/store/conf/conf.selector';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {ILAYER} from '@wm-core/types/config';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {combineLatest, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'wm-home-layer',
  templateUrl: './home-layer.component.html',
  styleUrls: ['./home-layer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLayerComponent implements OnDestroy {
  layer$ = this._store.select(ecLayer);
  showFavoriteHeart$ = combineLatest([
    this._store.select(isLogged),
    this._store.select(confOPTIONSShowFavorites),
  ]).pipe(map(([logged, enabled]) => logged && enabled));

  private _langChangeSub: Subscription;

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
    private _layerFavoriteSvc: LayerFavoriteService,
  ) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  isFavorite$(layer: ILAYER) {
    return this._layerFavoriteSvc.isFavorite$(layer.id);
  }

  async onFavoriteClick(event: Event, layer: ILAYER): Promise<void> {
    event.stopPropagation();
    if (!layer?.id || this._layerFavoriteSvc.isPending(layer.id)) {
      return;
    }
    await this._layerFavoriteSvc.toggle(layer);
  }

  ngOnDestroy(): void {
    this._langChangeSub?.unsubscribe();
  }
}
```

Nessun evento PostHog qui: `layerFavorited` è già emesso da `LayerBoxComponent.onFavoriteClick` — se l'utente aggiunge il preferito da `wm-home-layer`, l'evento non scatterebbe. Aggiungi la stessa chiamata `capture('layerFavorited', {layer_id: layer.id})` anche qui, iniettando `POSTHOG_CLIENT` con lo stesso pattern `@Optional() @Inject` usato in `layer-box.component.ts`:

```typescript
  isTogglingFavorite = false;

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
    private _layerFavoriteSvc: LayerFavoriteService,
    private _toastCtrl: ToastController,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  async onFavoriteClick(event: Event, layer: ILAYER): Promise<void> {
    event.stopPropagation();
    if (!layer?.id || this._layerFavoriteSvc.isPending(layer.id)) {
      return;
    }

    this.isTogglingFavorite = true;
    this._cdr.markForCheck();
    try {
      const favorite = await this._layerFavoriteSvc.toggle(layer);
      if (favorite && this._posthogClient) {
        this._posthogClient.capture('layerFavorited', {layer_id: layer.id});
      }
    } catch {
      const toast = await this._toastCtrl.create({
        message: 'Impossibile aggiornare i preferiti, riprova',
        duration: 2000,
      });
      await toast.present();
    } finally {
      this.isTogglingFavorite = false;
      this._cdr.markForCheck();
    }
  }
```

Aggiungi gli import: `import {Optional, Inject} from '@angular/core';` (unisci alla riga di import esistente da `@angular/core`), `import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';`, `import {WmPosthogClient} from '@wm-types/posthog';`, `import {ToastController} from '@ionic/angular';`.

- [ ] **Step 4: Aggiorna `home-layer.component.html`**

```html
<ng-container *ngIf="layer$|async as layer">
  <wm-img *ngIf="layer?.feature_image as img" [src]="img">
    <div class="wm-box-title" *ngIf="layer?.title as title">{{title | wmtrans}}</div>
    <wm-img
      *ngIf="layer?.logo_image | hasLogo"
      class="wm-home-layer-logo-overlay"
      [src]="layer.logo_image"
    ></wm-img>
    <i
      *ngIf="showFavoriteHeart$|async"
      class="wm-home-layer-favorite"
      [class.wm-home-layer-favorite--disabled]="isTogglingFavorite"
      [attr.aria-label]="(isFavorite$(layer)|async) ? ('Rimuovi dai preferiti'|wmtrans) : ('Aggiungi ai preferiti'|wmtrans)"
      [ngClass]="{
        'webmapp-icon-heart': isFavorite$(layer)|async,
        'webmapp-icon-heart-outline': !(isFavorite$(layer)|async)
      }"
      (click)="onFavoriteClick($event, layer)"
    ></i>
  </wm-img>

  <wm-tab-description
    *ngIf="layer?.description as description"
    [description]="description"
  ></wm-tab-description>
</ng-container>
```

- [ ] **Step 5: Aggiungi lo stile del cuoricino**

In `home-layer.component.scss`, aggiungi (accanto alle regole esistenti per `.wm-home-layer-logo-overlay`, se presenti — altrimenti in coda al file):

```scss
.wm-home-layer-favorite {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.35);
  z-index: 3;
  cursor: pointer;
  font-size: 22px;

  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}
```

- [ ] **Step 6: Esegui il test per verificare che passi**

Run: `ng test wm-core --include='**/home-layer.component.spec.ts'`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add projects/wm-core/src/home/home-layer/
git commit -m "feat(oc:8176): add favorite heart toggle to wm-home-layer"
```
