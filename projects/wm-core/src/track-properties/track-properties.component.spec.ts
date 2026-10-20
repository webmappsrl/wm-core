import {of} from 'rxjs';
import {TrackPropertiesComponent} from './track-properties.component';

describe('TrackPropertiesComponent.experienceContextLabel', () => {
  const store = {select: () => of(null)} as any;
  const component = new TrackPropertiesComponent(store, null as any, null as any);

  it('unisce tappa e cammino', () => {
    expect(component.experienceContextLabel('Tappa 05', 'Cammino X')).toBe('Tappa 05 · Cammino X');
  });

  it('senza cammino restituisce solo il nome, senza separatore finale', () => {
    expect(component.experienceContextLabel('Tappa 05', undefined)).toBe('Tappa 05');
    expect(component.experienceContextLabel('Tappa 05', '')).toBe('Tappa 05');
  });

  it('senza nome restituisce solo il cammino', () => {
    expect(component.experienceContextLabel(undefined, 'Cammino X')).toBe('Cammino X');
  });
});
