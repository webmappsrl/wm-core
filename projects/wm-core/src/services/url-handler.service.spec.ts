import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {BehaviorSubject, of} from 'rxjs';

import {UrlHandlerService} from './url-handler.service';
import {DeviceService} from './device.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {inputTyped} from '@wm-core/store/user-activity/user-activity.action';

describe('UrlHandlerService', () => {
  let service: UrlHandlerService;
  let posthogClientSpy: jasmine.SpyObj<{capture: (...args: any[]) => void}>;
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
    posthogClientSpy = jasmine.createSpyObj('WmPosthogClient', ['capture']);

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
    spyOn(service, 'navigateTo');
  });

  it('estrae track dall\'URL e naviga sulla mappa', () => {
    service.handleDeepLink('https://1.camminiditalia.webmapp.it/map?track=123');

    expect(service.navigateTo).toHaveBeenCalledWith(['map'], {track: '123'});
  });

  it('estrae poi, layer e filter insieme', () => {
    service.handleDeepLink('https://1.camminiditalia.webmapp.it/map?poi=1&layer=2&filter=3');

    expect(service.navigateTo).toHaveBeenCalledWith(['map'], {poi: '1', layer: '2', filter: '3'});
  });

  it('esclude ugc_track e ugc_poi dai queryParams', () => {
    service.handleDeepLink(
      'https://1.camminiditalia.webmapp.it/map?track=1&ugc_track=9&ugc_poi=8',
    );

    expect(service.navigateTo).toHaveBeenCalledWith(['map'], {track: '1'});
  });

  it('non naviga su URL malformato', () => {
    service.handleDeepLink('not-a-valid-url');

    expect(service.navigateTo).not.toHaveBeenCalled();
  });

  it('naviga su un path diverso da /map', () => {
    service.handleDeepLink('https://1.camminiditalia.webmapp.it/favourites?foo=bar');

    expect(service.navigateTo).toHaveBeenCalledWith(['favourites'], {foo: 'bar'});
  });

  it('naviga sulla root con query param (es. ricerca home)', () => {
    service.handleDeepLink('https://1.camminiditalia.webmapp.it/?search=sirena');

    expect(service.navigateTo).toHaveBeenCalledWith([], {search: 'sirena'});
  });

  it('naviga anche senza query param riconosciuti', () => {
    service.handleDeepLink('https://1.camminiditalia.webmapp.it/map');

    expect(service.navigateTo).toHaveBeenCalledWith(['map'], {});
  });

  it('invia un evento PostHog deepLinkOpened quando risolve un deep link valido', () => {
    service.handleDeepLink('https://1.camminiditalia.webmapp.it/map?track=123');

    expect(posthogClientSpy.capture).toHaveBeenCalledWith(
      'deepLinkOpened',
      jasmine.objectContaining({track: '123'}),
    );
  });

  it('aggiorna _currentQueryParams$ prima di dispatchare le action, non dopo', done => {
    // skip(1) in initialize() richiede una prima emissione "vuota" prima di quella osservata
    queryParams$.next({});

    let checked = false;
    dispatchSpy.and.callFake(() => {
      // initialize() esegue 7 dispatch per ogni emissione: la callFake viene invocata
      // una volta per ciascuno, quindi va verificato solo al primo per evitare che
      // done() venga chiamato più volte (errore Jasmine "called more than once").
      if (checked) return;
      checked = true;

      // Nel momento in cui avviene il PRIMO dispatch, getCurrentQueryParams() deve
      // già riflettere i nuovi query param — se _currentQueryParams$.next(params)
      // viene ancora eseguito DOPO i dispatch, questo fallisce (restituisce {}).
      expect(service.getCurrentQueryParams()).toEqual({track: '55821', layer: '164'});
      done();
    });

    queryParams$.next({track: '55821', layer: '164'});
  });

  describe('azzeramento e ripristino della ricerca (oc:8684)', () => {
    const navigatedParams = (): any =>
      (service.navigateTo as jasmine.Spy).calls.mostRecent().args[1];

    it('aprire una track toglie search e lo salva', () => {
      service['_currentQueryParams$'].next({search: 'due mari'});

      service.updateURL({track: 183});

      expect(service.navigateTo).toHaveBeenCalled();
      expect(navigatedParams().track).toBe(183);
      expect(navigatedParams().search).toBeUndefined();
      expect(service['_savedSearch']).toBe('due mari');
    });

    it('aprire un poi toglie search', () => {
      service['_currentQueryParams$'].next({search: 'due mari'});

      service.updateURL({poi: 5});

      expect(navigatedParams().poi).toBe(5);
      expect(navigatedParams().search).toBeUndefined();
      expect(service['_savedSearch']).toBe('due mari');
    });

    it('aprire un ugc_track non tocca search', () => {
      service['_currentQueryParams$'].next({search: 'due mari'});

      service.updateURL({ugc_track: 1});

      expect(navigatedParams().search).toBe('due mari');
      expect(service['_savedSearch']).toBeNull();
    });

    it('aprire un poi senza search non sovrascrive la copia', () => {
      service['_savedSearch'] = 'due mari';
      service['_currentQueryParams$'].next({track: '183'});

      service.updateURL({poi: 5});

      expect(service['_savedSearch']).toBe('due mari');
    });

    it('aprire un related poi non tocca la copia', () => {
      service['_savedSearch'] = 'due mari';
      service['_currentQueryParams$'].next({track: '183'});

      service.updateURL({ec_related_poi: 7});

      expect(navigatedParams().ec_related_poi).toBe(7);
      expect(service['_savedSearch']).toBe('due mari');
    });

    it('un link con track e search viene normalizzato', fakeAsync(() => {
      queryParams$.next({track: '183', search: 'rotta%20dei%20due%20mari'});
      tick(100);

      expect(service.navigateTo).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({track: '183', search: undefined}),
        {replaceUrl: true},
      );
      expect(service['_savedSearch']).toBe('rotta dei due mari');
      const searchDispatched = dispatchSpy.calls
        .allArgs()
        .some(
          ([action]) =>
            action.type === inputTyped.type && action.inputTyped === 'rotta dei due mari',
        );
      expect(searchDispatched).toBeFalse();
    }));

    it('la copia si cancella quando la track non è più nell\'URL', fakeAsync(() => {
      service['_savedSearch'] = 'x';

      queryParams$.next({layer: '50'});
      tick(100);

      expect(service['_savedSearch']).toBeNull();
    }));

    it('passare a un\'altra tappa conserva la copia', fakeAsync(() => {
      service['_savedSearch'] = 'due mari';

      queryParams$.next({track: '183'});
      tick(100);
      queryParams$.next({track: '184'});
      tick(100);

      expect(service['_savedSearch']).toBe('due mari');
      expect(service['_lastReadParams']).toEqual({track: '184'});
    }));

    it('una ricerca che ricompare dopo una track è marcata restored', fakeAsync(() => {
      queryParams$.next({track: '183'});
      tick(100);
      dispatchSpy.calls.reset();

      queryParams$.next({search: 'due mari'});
      tick(100);

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputTyped({inputTyped: 'due mari', restored: true}),
      );
    }));

    it('una ricerca che ricompare dopo un poi è marcata restored', fakeAsync(() => {
      queryParams$.next({poi: '5'});
      tick(100);
      dispatchSpy.calls.reset();

      queryParams$.next({search: 'x'});
      tick(100);

      expect(dispatchSpy).toHaveBeenCalledWith(inputTyped({inputTyped: 'x', restored: true}));
    }));

    it('digitare con il popup di un poi aperto non normalizza e avvia la ricerca', fakeAsync(() => {
      queryParams$.next({poi: '5'});
      tick(100);
      dispatchSpy.calls.reset();
      (service.navigateTo as jasmine.Spy).calls.reset();

      queryParams$.next({poi: '5', search: 'fontana'});
      tick(100);

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputTyped({inputTyped: 'fontana', restored: false}),
      );
      expect(service.navigateTo).not.toHaveBeenCalled();
      expect(service['_lastReadParams']).toEqual({poi: '5', search: 'fontana'});
    }));

    it('digitare con una track aperta non normalizza e avvia la ricerca', fakeAsync(() => {
      queryParams$.next({track: '183'});
      tick(100);
      dispatchSpy.calls.reset();
      (service.navigateTo as jasmine.Spy).calls.reset();

      queryParams$.next({track: '183', search: 'x'});
      tick(100);

      expect(dispatchSpy).toHaveBeenCalledWith(inputTyped({inputTyped: 'x', restored: false}));
      expect(service.navigateTo).not.toHaveBeenCalled();
    }));

    it('dopo la normalizzazione la lettura senza search non normalizza di nuovo', fakeAsync(() => {
      queryParams$.next({track: '183', search: 'due mari'});
      tick(100);
      (service.navigateTo as jasmine.Spy).calls.reset();

      // La navigazione con replaceUrl produce la lettura senza search.
      queryParams$.next({track: '183'});
      tick(100);

      expect(service.navigateTo).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(jasmine.objectContaining({currentEcTrackId: '183'}));
      expect(service['_lastReadParams']).toEqual({track: '183'});
      expect(service['_savedSearch']).toBe('due mari');
    }));

    it('passare a un altro poi con search presente normalizza', fakeAsync(() => {
      queryParams$.next({poi: '5'});
      tick(100);
      queryParams$.next({poi: '5', search: 'fontana'});
      tick(100);
      expect(service.navigateTo).not.toHaveBeenCalled();

      queryParams$.next({poi: '6', search: 'fontana'});
      tick(100);

      expect(service.navigateTo).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({poi: '6', search: undefined}),
        {replaceUrl: true},
      );
    }));

    it('updateURL con lo stesso poi già aperto non toglie search', () => {
      service['_currentQueryParams$'].next({poi: '5', search: 'fontana'});

      service.updateURL({poi: 5, layer: 2});

      expect(navigatedParams().search).toBe('fontana');
      expect(service['_savedSearch']).toBeNull();
    });

    it('una ricerca normale non è marcata restored', fakeAsync(() => {
      queryParams$.next({});
      tick(100);
      dispatchSpy.calls.reset();

      queryParams$.next({search: 'due mari'});
      tick(100);

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputTyped({inputTyped: 'due mari', restored: false}),
      );
    }));

    it('closeTrack ripristina la copia e la cancella', () => {
      service['_savedSearch'] = 'due mari';
      service['_currentQueryParams$'].next({track: '183'});

      service.closeTrack();

      expect(navigatedParams().track).toBeUndefined();
      expect(navigatedParams().search).toBe('due mari');
      expect(service['_savedSearch']).toBeNull();
    });

    it('closeTrack senza copia si comporta come oggi', () => {
      service['_currentQueryParams$'].next({track: '183'});

      service.closeTrack();

      expect(navigatedParams().track).toBeUndefined();
      expect('search' in navigatedParams()).toBeFalse();
    });
  });
});
