import {of} from 'rxjs';
import {TrackPropertiesComponent} from './track-properties.component';

describe('TrackPropertiesComponent.diaryContextLabel', () => {
  const store = {select: () => of(null)} as any;
  const component = new TrackPropertiesComponent(store, null as any, null as any);

  it('unisce tappa e cammino', () => {
    expect(component.diaryContextLabel('Tappa 05', 'Cammino X')).toBe('Tappa 05 · Cammino X');
  });

  it('senza cammino restituisce solo il nome, senza separatore finale', () => {
    expect(component.diaryContextLabel('Tappa 05', undefined)).toBe('Tappa 05');
    expect(component.diaryContextLabel('Tappa 05', '')).toBe('Tappa 05');
  });

  it('senza nome restituisce solo il cammino', () => {
    expect(component.diaryContextLabel(undefined, 'Cammino X')).toBe('Cammino X');
  });
});
