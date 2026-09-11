import {WmHomeLayerBaseComponent} from './home-layer-base.component';

/**
 * Guardia di regressione per il bug NG0202 scoperto in oc:8391: senza il
 * decorator `@Injectable()` su questa classe, il compilatore Angular non
 * genera la factory DI (`ɵfac`) da cui le sottoclassi (`WmHomeLayerComponent`,
 * in tutte le sue varianti per-shard) ereditano i parametri del costruttore
 * — l'assenza produce `NG0202` solo a runtime reale (mai negli spec che
 * istanziano il componente con `new`, che bypassano completamente Angular
 * DI), quindi qui si verifica direttamente l'artefatto compilato.
 */
describe('WmHomeLayerBaseComponent — DI', () => {
  it('genera la factory DI Angular (richiede il decorator @Injectable sulla classe)', () => {
    expect((WmHomeLayerBaseComponent as any).ɵfac).toBeDefined();
  });
});
