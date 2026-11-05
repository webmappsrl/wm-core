import {ecReducer} from './ec.reducer';
import {loadEcPoisFailure, loadEcPoisSuccess} from './ec.actions';

describe('ecReducer — ecPoisLoaded (oc:8933)', () => {
  const initial = ecReducer(undefined, {type: '@@init'} as any);

  it('stato iniziale → POI non ancora caricati', () => {
    expect(initial.ecPoisLoaded).toBe(false);
  });

  it('loadEcPoisSuccess → POI caricati', () => {
    const state = ecReducer(
      initial,
      loadEcPoisSuccess({featureCollection: {type: 'FeatureCollection', features: []}}),
    );
    expect(state.ecPoisLoaded).toBe(true);
  });

  it('loadEcPoisFailure → caricamento finito anche se fallito', () => {
    expect(ecReducer(initial, loadEcPoisFailure()).ecPoisLoaded).toBe(true);
  });
});
