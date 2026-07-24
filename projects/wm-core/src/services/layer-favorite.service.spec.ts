import {HttpTestingController, HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {ToastController} from '@ionic/angular';
import {of, BehaviorSubject} from 'rxjs';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {ILAYER} from '@wm-core/types/config';

import {LayerFavoriteService} from './layer-favorite.service';

/** Providers minimi condivisi da tutti i TestBed di questo file. */
function createBaseProviders(storeSpy: Store) {
  const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
  langSvcSpy.instant.and.callFake((key: string) => key);
  const toastPresentSpy = jasmine.createSpy('present').and.resolveTo();
  const toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
  toastCtrlSpy.create.and.resolveTo({present: toastPresentSpy} as any);

  return {
    providers: [
      LayerFavoriteService,
      {provide: Store, useValue: storeSpy},
      {provide: EnvironmentService, useValue: {origin: 'https://example.test'}},
      {provide: LangService, useValue: langSvcSpy},
      {provide: ToastController, useValue: toastCtrlSpy},
    ],
    toastCtrlSpy,
    toastPresentSpy,
  };
}

describe('LayerFavoriteService', () => {
  let service: LayerFavoriteService;
  let httpMock: HttpTestingController;
  let isLoggedSubject: BehaviorSubject<boolean>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastPresentSpy: jasmine.Spy;

  const layer1: ILAYER = {id: '1', title: 'Layer 1'} as any;
  const layer2: ILAYER = {id: '2', title: 'Layer 2'} as any;

  beforeEach(() => {
    TestBed.resetTestingModule();
    isLoggedSubject = new BehaviorSubject<boolean>(true);
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.callFake((selector: any) =>
      selector === isLogged ? isLoggedSubject.asObservable() : of(null),
    );

    const base = createBaseProviders(storeSpy);
    toastCtrlSpy = base.toastCtrlSpy;
    toastPresentSpy = base.toastPresentSpy;
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: base.providers,
    });

    service = TestBed.inject(LayerFavoriteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
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

  it('discards a stale getFavorites() response that resolves after a concurrent toggle() (fix oc:8176 #3)', async () => {
    // Un fetch parte (es. all'avvio) ma non si risolve subito — simula latenza.
    const favoritesPromise = service.getFavorites();
    const listReq = httpMock.expectOne('https://example.test/api/layer/favorite/list');

    // Mentre il fetch è ancora in volo, un toggle si risolve PRIMA e aggiunge layer1.
    const togglePromise = service.toggle(layer1);
    httpMock.expectOne('https://example.test/api/layer/favorite/toggle/1').flush({favorite: true});
    await togglePromise;

    let result: boolean;
    service.isFavorite$('1').subscribe(v => (result = v));
    expect(result).toBe(true);

    // Il fetch iniziale risolve tardi con uno snapshot del server antecedente al
    // toggle (senza layer1) — non deve sovrascrivere l'aggiornamento più recente.
    listReq.flush({favorites: []});
    await favoritesPromise;

    service.isFavorite$('1').subscribe(v => (result = v));
    expect(result).toBe(true);

    // Il fetch scartato non deve aver segnato la cache come "caricata": una nuova
    // getFavorites() deve rifare una richiesta fresca invece di fidarsi dello
    // snapshot superato.
    const freshPromise = service.getFavorites();
    httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: [layer1]});
    expect(await freshPromise).toEqual([layer1]);
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

  it('normalizes numeric ids from the backend to string so isFavorite$ matches (fix oc:8176 #2)', async () => {
    // Il backend reale (Eloquent, PHP) serializza `id` come numero JSON nativo,
    // non come stringa: simuliamo qui `res.favorites` con un `id` numerico.
    const promise = service.getFavorites();
    httpMock
      .expectOne('https://example.test/api/layer/favorite/list')
      .flush({favorites: [{id: 42, title: 'Layer numeric id'}]} as any);
    await promise;

    let result: boolean;
    service.isFavorite$('42').subscribe(v => (result = v));
    expect(result).toBe(true);
  });

  describe('toggleWithFeedback()', () => {
    it('resolves without side effects if a toggle for the same layer is already in progress', async () => {
      const promise = service.getFavorites();
      httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: []});
      await promise;

      // Simula un toggle già in corso: prima richiesta non ancora flush-ata.
      const firstToggle = service.toggle(layer1);
      const toggleReq = httpMock.expectOne('https://example.test/api/layer/favorite/toggle/1');

      await service.toggleWithFeedback(layer1);
      const noSecondRequest = httpMock.match('https://example.test/api/layer/favorite/toggle/1');
      expect(noSecondRequest.length).toBe(0);

      toggleReq.flush({favorite: true});
      await firstToggle;
    });

    it('shows a toast on toggle failure', async () => {
      const promise = service.getFavorites();
      httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: []});
      await promise;

      const feedbackPromise = service.toggleWithFeedback(layer1);
      httpMock
        .expectOne('https://example.test/api/layer/favorite/toggle/1')
        .flush('error', {status: 500, statusText: 'Server Error'});
      await feedbackPromise;

      expect(toastCtrlSpy.create).toHaveBeenCalled();
      expect(toastPresentSpy).toHaveBeenCalled();
    });

    it('does not show a toast on success', async () => {
      const promise = service.getFavorites();
      httpMock.expectOne('https://example.test/api/layer/favorite/list').flush({favorites: []});
      await promise;

      const feedbackPromise = service.toggleWithFeedback(layer1);
      httpMock.expectOne('https://example.test/api/layer/favorite/toggle/1').flush({favorite: true});
      await feedbackPromise;

      expect(toastCtrlSpy.create).not.toHaveBeenCalled();
      let result: boolean;
      service.isFavorite$('1').subscribe(v => (result = v));
      expect(result).toBe(true);
    });
  });
});

describe('LayerFavoriteService — auto-fetch on login (fix oc:8176 #1)', () => {
  const layer1: ILAYER = {id: '1', title: 'Layer 1'} as any;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('calls getFavorites() automatically when isLogged transitions from false to true', async () => {
    const isLoggedSubject = new BehaviorSubject<boolean>(false);
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.callFake((selector: any) =>
      selector === isLogged ? isLoggedSubject.asObservable() : of(null),
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: createBaseProviders(storeSpy).providers,
    });

    const service = TestBed.inject(LayerFavoriteService);
    const httpMock = TestBed.inject(HttpTestingController);

    // Utente non loggato all'avvio: nessuna richiesta deve partire.
    httpMock.expectNone('https://example.test/api/layer/favorite/list');

    // Login durante la sessione: la transizione false -> true deve innescare
    // automaticamente getFavorites(), senza che nessun chiamante lo invochi.
    isLoggedSubject.next(true);

    const req = httpMock.expectOne('https://example.test/api/layer/favorite/list');
    req.flush({favorites: [layer1]});

    // `flush()` risolve sincronamente l'observable HTTP sottostante, ma la
    // callback `.then()` che scrive in `_favorites$` (dentro `getFavorites()`,
    // invocato "fire and forget" dalla subscription) gira come microtask:
    // serve un giro di event loop prima di verificare la cache aggiornata.
    await Promise.resolve();

    let result: boolean;
    service.isFavorite$('1').subscribe(v => (result = v));
    expect(result).toBe(true);

    httpMock.verify();
  });
});

describe('LayerFavoriteService — toggle prima di qualsiasi getFavorites()', () => {
  const layer1: ILAYER = {id: '1', title: 'Layer 1'} as any;
  const layer2: ILAYER = {id: '2', title: 'Layer 2'} as any;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('still performs a real getFavorites() fetch after an optimistic toggle() with no prior fetch', async () => {
    // isLogged parte da false: a differenza del describe principale, il costruttore
    // NON avvia alcun auto-fetch — la premessa "nessun fetch in volo prima del
    // toggle" è quindi genuinamente vera, isolata dal comportamento di auto-fetch
    // al login (verificato a parte nel describe precedente).
    const isLoggedSubject = new BehaviorSubject<boolean>(false);
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.callFake((selector: any) =>
      selector === isLogged ? isLoggedSubject.asObservable() : of(null),
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: createBaseProviders(storeSpy).providers,
    });

    const service = TestBed.inject(LayerFavoriteService);
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectNone('https://example.test/api/layer/favorite/list');

    // toggle() before any getFavorites() call: this writes an optimistic,
    // partial list into `_favorites$` even though no full fetch has ever happened.
    const togglePromise = service.toggle(layer1);
    httpMock.expectOne('https://example.test/api/layer/favorite/toggle/1').flush({favorite: true});
    await togglePromise;

    let optimistic: boolean;
    service.isFavorite$('1').subscribe(v => (optimistic = v));
    expect(optimistic).toBe(true);

    // getFavorites() must still hit the backend for the real list instead of
    // treating the optimistic single-layer cache as already "loaded".
    const favoritesPromise = service.getFavorites();
    const req = httpMock.expectOne('https://example.test/api/layer/favorite/list');
    req.flush({favorites: [layer1, layer2]});

    expect(await favoritesPromise).toEqual([layer1, layer2]);

    // A subsequent call must not trigger another HTTP request (real cache is now populated).
    const cached = await service.getFavorites();
    expect(cached).toEqual([layer1, layer2]);
    httpMock.expectNone('https://example.test/api/layer/favorite/list');
    httpMock.verify();
  });
});
