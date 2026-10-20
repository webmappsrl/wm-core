import {of} from 'rxjs';
import {TrackPropertiesBaseComponent} from './track-properties-base.component';
import {TrackPropertiesComponent} from './track-properties.component';
import {TrackPropertiesComponent as TrackPropertiesCamminiditaliaComponent} from './track-properties.component.camminiditalia';

/**
 * Base e varianti di `wm-track-properties` (oc:8169): la sezione delle esperienze è accesa solo
 * dalla variante camminiditalia, sostituita con `fileReplacements`.
 */
describe('TrackPropertiesBaseComponent — varianti (oc:8169)', () => {
  const store = {select: () => of(null)} as any;

  /**
   * Guardia di regressione, come per `WmHomeLayerBaseComponent`: senza decorator Angular sulla
   * base non c'è la factory DI da cui le sottoclassi ereditano i parametri del costruttore, e
   * l'errore `NG0202` compare solo a runtime, mai negli spec che istanziano con `new`.
   */
  it('genera la factory DI Angular (richiede il decorator sulla classe)', () => {
    expect((TrackPropertiesBaseComponent as any).ɵfac).toBeDefined();
  });

  it('il default non mostra le esperienze', () => {
    const component = new TrackPropertiesComponent(store, null as any, null as any);
    expect(component.showExperiences).toBeFalse();
  });

  it('la variante camminiditalia mostra le esperienze', () => {
    const component = new TrackPropertiesCamminiditaliaComponent(store, null as any, null as any);
    expect(component.showExperiences).toBeTrue();
  });

  it('la variante camminiditalia eredita experienceContextLabel', () => {
    const component = new TrackPropertiesCamminiditaliaComponent(store, null as any, null as any);
    expect(component.experienceContextLabel('Tappa 05', 'Cammino X')).toBe('Tappa 05 · Cammino X');
  });

  it('default e variante dichiarano lo stesso selettore', () => {
    const selectorOf = (cls: any) => cls.ɵcmp?.selectors?.[0]?.[0];
    expect(selectorOf(TrackPropertiesComponent)).toBe('wm-track-properties');
    expect(selectorOf(TrackPropertiesCamminiditaliaComponent)).toBe('wm-track-properties');
  });
});
