import {of} from 'rxjs';
import {UgcPropertiesBaseComponent} from '@wm-core/ugc-properties-base/ugc-properties-base.component';
import {UgcTrackPropertiesBaseComponent} from './ugc-track-properties-base.component';
import {UgcTrackPropertiesComponent} from './ugc-track-properties.component';
import {UgcTrackPropertiesComponent as UgcTrackPropertiesCamminiditaliaComponent} from './ugc-track-properties.component.camminiditalia';

/**
 * Base e varianti di `wm-ugc-track-properties` (oc:8169): le esperienze collegate sono accese solo
 * dalla variante camminiditalia, sostituita con `fileReplacements`.
 */
describe('UgcTrackPropertiesBaseComponent — varianti (oc:8169)', () => {
  const store = {select: () => of([]), dispatch: () => {}} as any;

  /**
   * Guardia di regressione, come per `WmHomeLayerBaseComponent`: senza decorator Angular sulla
   * base non c'è la factory DI da cui le sottoclassi ereditano i parametri del costruttore, e
   * l'errore `NG0202` compare solo a runtime, mai negli spec che istanziano con `new`.
   */
  it('genera la factory DI Angular (richiede il decorator sulla classe)', () => {
    expect((UgcTrackPropertiesBaseComponent as any).ɵfac).toBeDefined();
  });

  it('il default non mostra le esperienze collegate', () => {
    const component = new UgcTrackPropertiesComponent(store, null as any, null as any, null as any);
    expect(component.showExperiences).toBeFalse();
  });

  it('la variante camminiditalia mostra le esperienze collegate', () => {
    const component = new UgcTrackPropertiesCamminiditaliaComponent(
      store,
      null as any,
      null as any,
      null as any,
    );
    expect(component.showExperiences).toBeTrue();
  });

  it('la gerarchia conserva UgcPropertiesBaseComponent (foto di wm-image-picker)', () => {
    const component = new UgcTrackPropertiesCamminiditaliaComponent(
      store,
      null as any,
      null as any,
      null as any,
    );
    expect(component instanceof UgcPropertiesBaseComponent).toBeTrue();
    component.photosChanged([{id: 1} as any]);
    expect((component as any).photos.length).toBe(1);
  });

  it('i @Input e gli @Output della base arrivano a entrambe le varianti', () => {
    const inputsOf = (cls: any) => Object.keys(cls.ɵcmp?.inputs ?? {});
    const outputsOf = (cls: any) => Object.keys(cls.ɵcmp?.outputs ?? {});
    for (const cls of [UgcTrackPropertiesComponent, UgcTrackPropertiesCamminiditaliaComponent]) {
      expect(inputsOf(cls)).toEqual(jasmine.arrayContaining(['track', 'shareResult']));
      expect(outputsOf(cls)).toEqual(
        jasmine.arrayContaining(['dismiss', 'poi-click', 'share-track']),
      );
    }
  });
});
