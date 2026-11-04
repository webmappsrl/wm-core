import {TestBed} from '@angular/core/testing';
import {ToastController} from '@ionic/angular';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {BehaviorSubject} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {selectDiariesSession} from '@wm-core/diaries/diary.service';
import {confMAPLAYERS} from '@wm-core/store/conf/conf.selector';
import {PassportRoute} from '@wm-types/passport';
import {fakeLangService} from '../testing/fake-trans';
import {PassportService} from '../passport.service';
import {PassportModalService} from '../passport-modal/passport-modal.service';
import {
  ROUTE_COMPLETED_SEEN_STORE,
  RouteCompletedNoticeService,
  RouteCompletedSeenStore,
} from './route-completed-notice.service';

/**
 * Cammino del Passaporto di prova.
 * @param layerId id del cammino
 * @param completed se è completato
 * @returns il cammino
 */
function route(layerId: number, completed: boolean): PassportRoute {
  return {layerId, validated: completed ? 3 : 1, total: 3, percent: completed ? 100 : 33, completed, validatedTracks: {}};
}

/**
 * Mappa dei cammini.
 * @param routes cammini
 * @returns la mappa per id
 */
function routesMap(...routes: PassportRoute[]): Map<number, PassportRoute> {
  return new Map(routes.map(r => [r.layerId, r]));
}

/** Attende che le promesse in coda si risolvano. */
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

describe('RouteCompletedNoticeService (oc:8169)', () => {
  let svc: RouteCompletedNoticeService;
  let store: MockStore;
  let routes$: BehaviorSubject<Map<number, PassportRoute> | null>;
  let seen: Map<string, number[]>;
  let toasts: {opts: any; dismiss: (role: string) => void}[];
  let modalSvc: jasmine.SpyObj<PassportModalService>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    routes$ = new BehaviorSubject<Map<number, PassportRoute> | null>(null);
    seen = new Map();
    toasts = [];
    const seenStore: RouteCompletedSeenStore = {
      getItem: async (key: string) => seen.get(key) ?? null,
      setItem: async (key: string, value: number[]) => {
        seen.set(key, value);
        return value;
      },
    };
    modalSvc = jasmine.createSpyObj('PassportModalService', ['open']);
    modalSvc.open.and.resolveTo();
    const toastCtrl = {
      create: jasmine.createSpy('create').and.callFake(async (opts: any) => {
        let resolveDismiss: (v: {role: string}) => void = () => undefined;
        const dismissed = new Promise<{role: string}>(r => (resolveDismiss = r));
        const toast = {
          present: async () => undefined,
          dismiss: async () => resolveDismiss({role: 'timeout'}),
          onDidDismiss: () => dismissed,
        };
        toasts.push({opts, dismiss: role => resolveDismiss({role})});
        return toast;
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            {selector: selectDiariesSession, value: {logged: true, userId: 5}},
            {
              selector: confMAPLAYERS,
              value: [
                {id: 3, title: 'Via degli Dei', logo_image: 'logo3', feature_image: 'img3'},
                {id: 4, title: 'Cammino di Santa Barbara'},
                {id: 6, title: 'Via Francigena'},
              ],
            },
          ],
        }),
        {provide: PassportService, useValue: {passportRoutes$: () => routes$.asObservable()}},
        {provide: PassportModalService, useValue: modalSvc},
        {provide: ToastController, useValue: toastCtrl},
        {provide: LangService, useValue: fakeLangService()},
        {provide: ROUTE_COMPLETED_SEEN_STORE, useValue: seenStore},
      ],
    });
    store = TestBed.inject(MockStore);
    svc = TestBed.inject(RouteCompletedNoticeService);
  });

  afterEach(() => {
    svc.ngOnDestroy();
    // gli override di MockStore restano sui selettori memoizzati, che sono globali: senza reset
    // `selectDiariesSession` resterebbe sovrascritto negli spec che girano dopo
    store.resetSelectors();
    TestBed.resetTestingModule();
  });

  it('alla prima esecuzione segna come visti i cammini già completati, senza schede', async () => {
    svc.start();
    routes$.next(routesMap(route(3, true), route(4, true), route(6, false)));
    await flush();

    expect(toasts.length).toBe(0);
    expect(seen.get('u5')).toEqual([3, 4]);
  });

  it('un cammino completato dopo mostra una scheda in alto, persistente', async () => {
    seen.set('u5', []);
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();

    expect(toasts.length).toBe(1);
    const opts = toasts[0].opts;
    expect(opts.position).toBe('top');
    expect(opts.duration).toBe(0);
    expect(opts.swipeGesture).toBe('vertical');
    // bottoni sotto il testo: affiancati stringono titolo e messaggio a poche lettere per riga
    expect(opts.layout).toBe('stacked');
    expect(opts.header).toBe('Hai completato Via degli Dei!');
    expect(opts.buttons.map((b: any) => b.text)).toEqual(['Più tardi', 'Vai al traguardo']);
    expect(seen.get('u5')).toEqual([3]);
  });

  it('due cammini nuovi: la seconda scheda solo dopo la chiusura della prima', async () => {
    seen.set('u5', []);
    svc.start();
    routes$.next(routesMap(route(3, true), route(4, true)));
    await flush();
    expect(toasts.length).toBe(1);

    toasts[0].dismiss('cancel');
    await flush();

    expect(toasts.length).toBe(2);
    expect(toasts[1].opts.header).toBe('Hai completato Cammino di Santa Barbara!');
  });

  it('chiusura e aggiornamento dei cammini insieme: sempre una scheda alla volta, nessun doppione', async () => {
    seen.set('u5', []);
    svc.start();
    routes$.next(routesMap(route(3, true), route(4, true)));
    await flush();
    expect(toasts.length).toBe(1);

    // «Più tardi» e il Passaporto che riemette (ritorno in primo piano) nello stesso momento
    toasts[0].dismiss('cancel');
    routes$.next(routesMap(route(3, true), route(4, true), route(6, true)));
    await flush();
    await flush();

    expect(toasts.length).toBe(2);
    expect(toasts[1].opts.header).toBe('Hai completato Cammino di Santa Barbara!');

    toasts[1].dismiss('cancel');
    await flush();
    await flush();

    expect(toasts.map(t => t.opts.header)).toEqual([
      'Hai completato Via degli Dei!',
      'Hai completato Cammino di Santa Barbara!',
      'Hai completato Via Francigena!',
    ]);
    expect([...(seen.get('u5') ?? [])].sort()).toEqual([3, 4, 6]);
  });

  it('un errore nel salvare i visti non blocca le schede successive', async () => {
    seen.set('u5', []);
    const seenStore = TestBed.inject(ROUTE_COMPLETED_SEEN_STORE);
    const setItem = seenStore.setItem;
    let failures = 1;
    seenStore.setItem = (key: string, value: number[]) =>
      failures-- > 0 ? Promise.reject(new Error('quota')) : setItem(key, value);
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();
    expect(toasts.length).toBe(0);

    routes$.next(routesMap(route(3, true), route(4, true)));
    await flush();
    await flush();

    expect(toasts.length).toBe(1);
  });

  it('«Vai al traguardo» apre il dettaglio del Passaporto del cammino', async () => {
    seen.set('u5', []);
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();

    toasts[0].dismiss('open');
    await flush();

    expect(modalSvc.open).toHaveBeenCalledWith(
      {layerId: 3, layerTitle: 'Via degli Dei', layerLogo: 'logo3', layerImage: 'img3'},
      {refresh: true},
    );
  });

  it('un cammino già visto non riappare', async () => {
    seen.set('u5', [3]);
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();

    expect(toasts.length).toBe(0);
  });

  it('i visti sono separati per utente', async () => {
    seen.set('u5', [3]);
    store.overrideSelector(selectDiariesSession, {logged: true, userId: 9});
    store.refreshState();
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();

    expect(toasts.length).toBe(0);
    expect(seen.get('u9')).toEqual([3]);
  });

  it('da non loggato non mostra nulla', async () => {
    store.overrideSelector(selectDiariesSession, {logged: false, userId: null});
    store.refreshState();
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();

    expect(toasts.length).toBe(0);
    expect(seen.size).toBe(0);
  });

  it('start è idempotente', async () => {
    seen.set('u5', []);
    svc.start();
    svc.start();
    routes$.next(routesMap(route(3, true)));
    await flush();

    expect(toasts.length).toBe(1);
  });
});
