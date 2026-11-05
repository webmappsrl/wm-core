import {homeResultEmptyState, HomeResultEmptyStateInput} from './home-result-empty-state';

describe('homeResultEmptyState', () => {
  // Caso del bug (oc:8765): filtri Home attivi, nessun cammino corrispondente, ma Elastic ha
  // comunque tracce/POI, che i filtri Home nascondono.
  const base: HomeResultEmptyStateInput = {
    countAll: 5,
    countLayers: 0,
    hasActiveRouteFilters: true,
    hasCurrentLayer: false,
    tracksLoading: false,
    ugcOpened: false,
    showTracks: true,
    countPois: 0,
    poisLoaded: true,
  };

  it('filtri attivi e zero cammini → filters, anche con tracce e POI presenti', () => {
    expect(homeResultEmptyState(base)).toBe('filters');
  });

  it('filtri attivi, zero cammini, tracce in caricamento → filters', () => {
    expect(homeResultEmptyState({...base, tracksLoading: true})).toBe('filters');
  });

  it('filtri attivi e un layer aperto → non filters', () => {
    expect(homeResultEmptyState({...base, hasCurrentLayer: true})).toBeNull();
    expect(homeResultEmptyState({...base, hasCurrentLayer: true, countAll: 0})).toBe('generic');
  });

  it('filtri attivi con le UGC aperte → non filters', () => {
    expect(homeResultEmptyState({...base, ugcOpened: true})).toBeNull();
    expect(homeResultEmptyState({...base, ugcOpened: true, countAll: 0})).toBe('generic');
  });

  it('filtri attivi con cammini corrispondenti → null', () => {
    expect(homeResultEmptyState({...base, countLayers: 3})).toBeNull();
  });

  it('tutto a zero senza filtri → generic', () => {
    expect(homeResultEmptyState({...base, hasActiveRouteFilters: false, countAll: 0})).toBe(
      'generic',
    );
  });

  it('tutto a zero in caricamento → null', () => {
    expect(
      homeResultEmptyState({
        ...base,
        hasActiveRouteFilters: false,
        countAll: 0,
        tracksLoading: true,
      }),
    ).toBeNull();
  });

  it('risultati senza filtri → null', () => {
    expect(homeResultEmptyState({...base, hasActiveRouteFilters: false})).toBeNull();
  });

  // oc:8933: soli filtri POI (showTracks false), la ricerca trova solo sentieri, che sono nascosti.
  describe('soli filtri POI', () => {
    const onlyPois: HomeResultEmptyStateInput = {
      ...base,
      hasActiveRouteFilters: false,
      countAll: 3,
      showTracks: false,
    };

    it('nessun POI e nessun cammino, POI caricati → generic', () => {
      expect(homeResultEmptyState(onlyPois)).toBe('generic');
    });

    it('POI non ancora caricati → null', () => {
      expect(homeResultEmptyState({...onlyPois, poisLoaded: false})).toBeNull();
    });

    it('la ricerca trova cammini → null (si vede il tab layers)', () => {
      expect(homeResultEmptyState({...onlyPois, countLayers: 2})).toBeNull();
    });

    it('ci sono POI → null', () => {
      expect(homeResultEmptyState({...onlyPois, countPois: 5})).toBeNull();
    });

    it('tracce visibili → null (invariato)', () => {
      expect(homeResultEmptyState({...onlyPois, showTracks: true})).toBeNull();
    });

    it('POI non ancora caricati e nessuna traccia → null, non generic', () => {
      expect(homeResultEmptyState({...onlyPois, poisLoaded: false, countAll: 0})).toBeNull();
    });

    it('con filtri Home attivi e zero cammini resta filters', () => {
      expect(homeResultEmptyState({...onlyPois, hasActiveRouteFilters: true})).toBe('filters');
    });
  });
});
