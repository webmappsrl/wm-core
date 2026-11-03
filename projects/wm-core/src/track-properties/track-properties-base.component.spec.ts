import {of} from 'rxjs';
import {TrackPropertiesBaseComponent} from './track-properties-base.component';
import {TrackPropertiesComponent} from './track-properties.component';
import {TrackPropertiesComponent as TrackPropertiesCamminiditaliaComponent} from './track-properties.component.camminiditalia';
import {TestBed} from '@angular/core/testing';
import {ActiveRouteService} from '@wm-core/diaries/active-route.service';

/**
 * Base e varianti di `wm-track-properties` (oc:8169): la sezione delle esperienze è accesa solo
 * dalla variante camminiditalia, sostituita con `fileReplacements`.
 */
describe('TrackPropertiesBaseComponent — varianti (oc:8169)', () => {
  const store = {select: () => of(null)} as any;
  /** La variante legge ActiveRouteService con `inject()`: si crea in un contesto di iniezione. */
  const variant = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{provide: ActiveRouteService, useValue: {canWrite$: () => of(true), evaluateTrack: async () => {}, lastPositionAt$: of(null)}}],
    });
    return TestBed.runInInjectionContext(
      () => new TrackPropertiesCamminiditaliaComponent(store, null as any, null as any),
    );
  };

  afterEach(() => TestBed.resetTestingModule());

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
    expect(component.showDiaries).toBeFalse();
  });

  it('nel default il pulsante del diario c\'è sempre (oc:8169, ciclo 2)', done => {
    const component = new TrackPropertiesComponent(store, null as any, null as any);
    component.diaryCanWrite$.subscribe(v => {
      expect(v).toBeTrue();
      done();
    });
  });

  it('la variante camminiditalia mostra le esperienze', () => {
    const component = variant();
    expect(component.showDiaries).toBeTrue();
  });

  it('la variante camminiditalia eredita diaryContextLabel', () => {
    const component = variant();
    expect(component.diaryContextLabel('Tappa 05', 'Cammino X')).toBe('Tappa 05 · Cammino X');
  });

  it('default e variante dichiarano lo stesso selettore', () => {
    const selectorOf = (cls: any) => cls.ɵcmp?.selectors?.[0]?.[0];
    expect(selectorOf(TrackPropertiesComponent)).toBe('wm-track-properties');
    expect(selectorOf(TrackPropertiesCamminiditaliaComponent)).toBe('wm-track-properties');
  });
});
