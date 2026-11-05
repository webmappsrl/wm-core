import {homeResultTab, HomeResultTabInput, HomeResultTabResult} from './home-result-tab';

describe('homeResultTab', () => {
  const tabAndTracks = ({tab, tracksTabVisible}: HomeResultTabResult) => ({tab, tracksTabVisible});
  const base: HomeResultTabInput = {
    countTracks: 12,
    countPois: 90,
    countLayers: 0,
    userSelectedTab: null,
    showTracks: true,
    hasCurrentLayer: false,
    hasActiveRouteFilters: false,
  };

  it('nessun filtro → tracks, pulsante Tracks visibile', () => {
    expect(tabAndTracks(homeResultTab(base))).toEqual({tab: 'tracks', tracksTabVisible: true});
  });

  it('soli filtri POI → pois, pulsante Tracks nascosto (oc:8933)', () => {
    expect(tabAndTracks(homeResultTab({...base, showTracks: false}))).toEqual({tab: 'pois', tracksTabVisible: false});
  });

  it('soli filtri POI dopo un clic su Tracks → pois, perché il pulsante Tracks non c\'è', () => {
    expect(homeResultTab({...base, showTracks: false, userSelectedTab: 'tracks'}).tab).toBe('pois');
  });

  it('soli filtri POI e ricerca che trova cammini → layers', () => {
    expect(homeResultTab({...base, showTracks: false, countLayers: 2}).tab).toBe('layers');
  });

  it('soli filtri POI e nessun POI → nessun tab', () => {
    expect(tabAndTracks(homeResultTab({...base, showTracks: false, countPois: 0}))).toEqual({
      tab: null,
      tracksTabVisible: false,
    });
  });

  it('filtro rimosso dopo un clic su Tracks → torna tracks', () => {
    expect(homeResultTab({...base, userSelectedTab: 'tracks'}).tab).toBe('tracks');
  });

  it('clic su POI con le tracce visibili → pois', () => {
    expect(homeResultTab({...base, userSelectedTab: 'pois'}).tab).toBe('pois');
  });

  it('layer disponibili e nessuna scelta → layers; con un layer aperto mai layers', () => {
    expect(homeResultTab({...base, countLayers: 3}).tab).toBe('layers');
    expect(homeResultTab({...base, countLayers: 3, hasCurrentLayer: true}).tab).toBe('tracks');
    expect(
      homeResultTab({...base, countLayers: 3, hasCurrentLayer: true, userSelectedTab: 'layers'}).tab,
    ).toBe('tracks');
  });

  it('filtri Home attivi senza layer aperto → layers, o nessun tab senza cammini (oc:8414)', () => {
    expect(tabAndTracks(homeResultTab({...base, hasActiveRouteFilters: true, countLayers: 3}))).toEqual({
      tab: 'layers',
      tracksTabVisible: false,
    });
    expect(tabAndTracks(homeResultTab({...base, hasActiveRouteFilters: true, countLayers: 0}))).toEqual({
      tab: null,
      tracksTabVisible: false,
    });
  });

  it('filtri Home attivi con un layer aperto → tracks, pulsante Tracks visibile', () => {
    expect(tabAndTracks(homeResultTab({...base, hasActiveRouteFilters: true, hasCurrentLayer: true}))).toEqual({
      tab: 'tracks',
      tracksTabVisible: true,
    });
  });

  it('nessuna traccia → pois, pulsante Tracks nascosto', () => {
    expect(tabAndTracks(homeResultTab({...base, countTracks: 0}))).toEqual({tab: 'pois', tracksTabVisible: false});
  });
});

describe('homeResultTab — poisTabVisible', () => {
  const base: HomeResultTabInput = {
    countTracks: 12,
    countPois: 90,
    countLayers: 0,
    userSelectedTab: null,
    showTracks: true,
    hasCurrentLayer: false,
    hasActiveRouteFilters: false,
  };

  it('ci sono POI → pulsante POI visibile', () => {
    expect(homeResultTab(base).poisTabVisible).toBe(true);
  });

  it('nessun POI → pulsante POI nascosto', () => {
    expect(homeResultTab({...base, countPois: 0}).poisTabVisible).toBe(false);
  });

  it('filtri Home attivi senza layer aperto → pulsante POI nascosto (oc:8414)', () => {
    expect(homeResultTab({...base, hasActiveRouteFilters: true, countLayers: 3}).poisTabVisible).toBe(false);
  });

  it('filtri Home attivi con un layer aperto → pulsante POI visibile', () => {
    expect(homeResultTab({...base, hasActiveRouteFilters: true, hasCurrentLayer: true}).poisTabVisible).toBe(true);
  });
});
