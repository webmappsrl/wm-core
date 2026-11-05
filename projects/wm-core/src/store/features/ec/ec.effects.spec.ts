import {Actions} from '@ngrx/effects';
import {EMPTY, Subject, of} from 'rxjs';

import {EcEffects} from './ec.effects';
import {ecTracks, loadEcPois, loadEcPoisFailure, loadEcPoisSuccess} from './ec.actions';

describe('EcEffects - queryApi$ (oc:8684)', () => {
  let actions$: Subject<any>;
  let posthogSpy: jasmine.SpyObj<{capture: (...args: any[]) => void}>;
  let effects: EcEffects;

  beforeEach(() => {
    actions$ = new Subject<any>();
    posthogSpy = jasmine.createSpyObj('WmPosthogClient', ['capture']);
    const ecSvcStub: any = {getQuery: () => Promise.resolve({hits: [{}, {}]})};
    effects = new EcEffects(ecSvcStub, actions$ as unknown as Actions, posthogSpy as any);
  });

  it('non registra searchPerformed se skipSearchTracking', done => {
    effects.queryApi$.subscribe(() => {
      expect(posthogSpy.capture).not.toHaveBeenCalled();
      done();
    });

    actions$.next(ecTracks({inputTyped: 'due mari', skipSearchTracking: true}));
  });

  it('registra searchPerformed senza skipSearchTracking', done => {
    effects.queryApi$.subscribe(() => {
      expect(posthogSpy.capture).toHaveBeenCalledWith('searchPerformed', {
        query: 'due mari',
        results_count: 2,
      });
      done();
    });

    actions$.next(ecTracks({inputTyped: 'due mari'}));
  });
});

describe('EcEffects - loadEcPois$ (oc:8933)', () => {
  const build = (pois$: any) => {
    const actions$ = new Subject<any>();
    const ecSvcStub: any = {getPois: () => pois$};
    const effects = new EcEffects(ecSvcStub, actions$ as unknown as Actions, {capture: () => {}} as any);
    return {actions$, effects};
  };

  it('getPois che completa senza emettere (200 senza body, nessuna cache) → loadEcPoisFailure', done => {
    const {actions$, effects} = build(EMPTY);
    effects.loadEcPois$.subscribe(action => {
      expect(action).toEqual(loadEcPoisFailure());
      done();
    });
    actions$.next(loadEcPois());
  });

  it('getPois che emette → loadEcPoisSuccess', done => {
    const featureCollection: any = {type: 'FeatureCollection', features: []};
    const {actions$, effects} = build(of(featureCollection));
    effects.loadEcPois$.subscribe(action => {
      expect(action).toEqual(loadEcPoisSuccess({featureCollection}));
      done();
    });
    actions$.next(loadEcPois());
  });
});
