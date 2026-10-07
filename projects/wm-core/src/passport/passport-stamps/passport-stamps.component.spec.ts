import {BehaviorSubject, firstValueFrom, of} from 'rxjs';
import {confMAPLAYERS} from '@wm-core/store/conf/conf.selector';
import {PassportRoute} from '@wm-types/passport';
import {PassportRoutesState} from '../passport.service';
import {PassportStamp} from '../passport.utils';
import {WmPassportStampsComponent} from './passport-stamps.component';

describe('WmPassportStampsComponent (oc:8703)', () => {
  const layers = [
    {
      id: '1',
      title: {it: 'Via degli Dei', en: 'Way of the Gods'},
      logo_image: 'l1.png',
      feature_image: 'f1.jpg',
      attributes: {stage_count: 6},
    },
    {id: '2', title: 'Cammino di Oropa', logo_image: 'l2.png', feature_image: 'f2.jpg'},
  ];
  const route = (
    layerId: number,
    validated: number,
    total: number,
    completed = false,
  ): PassportRoute => ({
    layerId,
    validated,
    total,
    percent: Math.floor((validated * 100) / total),
    completed,
  });

  let state$: BehaviorSubject<PassportRoutesState>;
  let layers$: BehaviorSubject<unknown>;
  let refreshPassport: jasmine.Spy;
  let open: jasmine.Spy;

  function create(): WmPassportStampsComponent {
    const store = {select: (sel: unknown) => (sel === confMAPLAYERS ? layers$ : of(null))} as any;
    refreshPassport = jasmine.createSpy('refreshPassport');
    open = jasmine.createSpy('open').and.resolveTo();
    const lang = {
      currentLang: 'en',
      defaultLang: 'it',
      instant: (key: string, params?: Record<string, unknown>) =>
        Object.entries(params ?? {}).reduce((t, [k, v]) => t.replace(`{{${k}}}`, `${v}`), key),
    } as any;
    return new WmPassportStampsComponent(
      store,
      {passportRoutesState$: () => state$, refreshPassport} as any,
      {open} as any,
      lang,
    );
  }

  beforeEach(() => {
    state$ = new BehaviorSubject<PassportRoutesState>({status: 'loading'});
    layers$ = new BehaviorSubject<unknown>(layers);
  });

  it('caricamento: mai la griglia tutta grigia', async () => {
    expect(await firstValueFrom(create().vm$)).toEqual({status: 'loading'});
  });

  it('senza config dei layer resta in caricamento', async () => {
    layers$.next(undefined);
    state$.next({status: 'ready', routes: new Map()});

    expect(await firstValueFrom(create().vm$)).toEqual({status: 'loading'});
  });

  it('utente uscito: resta in caricamento (la pagina porta alla Home)', async () => {
    state$.next({status: 'logged-out'});

    expect(await firstValueFrom(create().vm$)).toEqual({status: 'loading'});
  });

  it('errore senza dati: error, e Riprova rilegge', async () => {
    state$.next({status: 'error'});
    const cmp = create();

    expect(await firstValueFrom(cmp.vm$)).toEqual({status: 'error'});
    cmp.retry();
    expect(refreshPassport).toHaveBeenCalled();
  });

  it('nessun cammino iniziato: tutti non iniziati e anyStarted falso', async () => {
    state$.next({status: 'ready', routes: new Map()});
    const vm: any = await firstValueFrom(create().vm$);

    expect(vm.status).toBe('ready');
    expect(vm.anyStarted).toBeFalse();
    expect(vm.stamps.map((s: PassportStamp) => s.status)).toEqual(['not_started', 'not_started']);
  });

  it('con un cammino in corso: prima lui, anyStarted vero', async () => {
    state$.next({status: 'ready', routes: new Map([[2, route(2, 3, 5)]])});
    const vm: any = await firstValueFrom(create().vm$);

    expect(vm.anyStarted).toBeTrue();
    expect(vm.stamps.map((s: PassportStamp) => s.layerId)).toEqual([2, 1]);
  });

  it('il tocco apre il dettaglio con il titolo tradotto e rilegge il progresso', () => {
    const cmp = create();
    const stamp: PassportStamp = {
      layerId: 1,
      title: layers[0].title as any,
      logo: 'l1.png',
      image: 'f1.jpg',
      status: 'not_started',
      validated: 0,
      total: 6,
      percent: 0,
    };

    cmp.open(stamp);

    expect(open).toHaveBeenCalledOnceWith(
      {layerId: 1, layerTitle: 'Way of the Gods', layerLogo: 'l1.png', layerImage: 'f1.jpg'},
      {refresh: true},
    );
  });

  it('etichetta accessibile nei tre stati', () => {
    const cmp = create();
    const base = {
      layerId: 2,
      title: 'Cammino di Oropa',
      logo: null,
      image: null,
      percent: 0,
    } as const;

    expect(cmp.ariaLabel({...base, status: 'in_progress', validated: 3, total: 5})).toBe(
      'Cammino di Oropa, 3 di 5 tappe',
    );
    expect(cmp.ariaLabel({...base, status: 'completed', validated: 5, total: 5})).toBe(
      'Cammino di Oropa, completato',
    );
    expect(cmp.ariaLabel({...base, status: 'not_started', validated: 0, total: 5})).toBe(
      'Cammino di Oropa, non iniziato',
    );
  });
});
