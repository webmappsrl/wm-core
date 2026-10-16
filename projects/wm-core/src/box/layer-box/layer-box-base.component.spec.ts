import {LayerBoxBaseComponent} from './layer-box-base.component';

/**
 * Guardia di regressione (oc:8701, come per `WmHomeLayerBaseComponent`): senza decorator Angular
 * sulla base non c'è la factory DI da cui le sottoclassi ereditano i parametri del costruttore, e
 * l'errore `NG0202` compare solo a runtime, mai negli spec che istanziano con `new`.
 */
describe('LayerBoxBaseComponent — DI', () => {
  it('genera la factory DI Angular (richiede il decorator sulla classe)', () => {
    expect((LayerBoxBaseComponent as any).ɵfac).toBeDefined();
  });
});
