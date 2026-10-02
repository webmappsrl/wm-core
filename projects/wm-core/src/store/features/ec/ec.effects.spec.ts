import {Actions} from '@ngrx/effects';
import {Subject, of} from 'rxjs';

import {EcEffects} from './ec.effects';
import {ecTracks} from './ec.actions';

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
