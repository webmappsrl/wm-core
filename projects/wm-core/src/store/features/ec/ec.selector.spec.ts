import {poisStats, trackPanelPois} from './ec.selector';
import {poisFiltersPanelCount} from '../features.selector';

const poi = (id: number, type: string) => ({
  type: 'Feature',
  geometry: {type: 'Point', coordinates: [0, 0]},
  properties: {id, name: {it: `poi ${id}`}, taxonomy: {poi_type: {identifier: type}}},
});
const track: any = {properties: {id: 1}};
const related: any[] = [poi(1, 'accomodation'), poi(2, 'accomodation'), poi(3, 'catering')];
const global = {poi_type_hotel: 9};
const ids = (pois: any[]) => pois.map(p => p.properties.id);

describe('trackPanelPois', () => {
  it('senza track restituisce null', () => {
    expect(trackPanelPois.projector(null, related, [], '')).toBeNull();
  });

  it('con una track aperta restituisce i POI della track', () => {
    expect(ids(trackPanelPois.projector(track, related, [], ''))).toEqual([1, 2, 3]);
  });

  it('con una track aperta senza related_pois restituisce una lista vuota', () => {
    expect(trackPanelPois.projector(track, null, [], '')).toEqual([]);
  });

  it('applica le tipologie selezionate', () => {
    const res = trackPanelPois.projector(track, related, ['poi_type_catering'], '');
    expect(ids(res)).toEqual([3]);
  });
});

describe('poisStats', () => {
  it('con una track aperta conta i POI della track', () => {
    const trackPois = trackPanelPois.projector(track, related, [], '');
    const res = poisStats.projector(global, trackPois);
    expect(res).toEqual({poi_type_accomodation: 2, poi_type_catering: 1});
  });

  it('con una track aperta senza POI la sezione è vuota', () => {
    expect(poisStats.projector(global, [])).toEqual({});
  });

  it('con una track aperta applica le tipologie selezionate', () => {
    const trackPois = trackPanelPois.projector(track, related, ['poi_type_catering'], '');
    expect(poisStats.projector(global, trackPois)).toEqual({poi_type_catering: 1});
  });

  it('senza track restituisce le statistiche globali di oggi', () => {
    expect(poisStats.projector(global, null)).toBe(global);
  });
});

describe('poisFiltersPanelCount', () => {
  it('con una track aperta conta i POI della track filtrati', () => {
    const trackPois = trackPanelPois.projector(track, related, ['poi_type_accomodation'], '');
    expect(poisFiltersPanelCount.projector(trackPois, 7, 5, false)).toBe(2);
  });

  it('con una track aperta senza POI conta zero', () => {
    expect(poisFiltersPanelCount.projector([], 7, 5, false)).toBe(0);
  });

  it('senza track restituisce countEcPois', () => {
    expect(poisFiltersPanelCount.projector(null, 7, 5, false)).toBe(7);
  });

  it('con UGC aperto restituisce countUgcPois', () => {
    expect(poisFiltersPanelCount.projector(related, 7, 5, true)).toBe(5);
  });
});
