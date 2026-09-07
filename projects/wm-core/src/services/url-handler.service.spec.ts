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
