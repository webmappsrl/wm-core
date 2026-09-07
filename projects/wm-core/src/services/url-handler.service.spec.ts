import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {BehaviorSubject, of} from 'rxjs';

import {UrlHandlerService} from './url-handler.service';
import {DeviceService} from './device.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';

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
});
