import {addIcons, loadIconsSuccess} from './icons.actions';
import {iconsReducer, initialState} from './icons.reducer';

describe('iconsReducer', () => {
  it('addIcons su stato vuoto registra le icone', () => {
    const state = iconsReducer(initialState, addIcons({icons: {a: 'inline'}}));
    expect(state.icons).toEqual({a: 'inline'});
  });

  it('addIcons non sovrascrive un nome già caricato da icons.json', () => {
    let state = iconsReducer(initialState, loadIconsSuccess({icons: {a: 'json'}}));
    state = iconsReducer(state, addIcons({icons: {a: 'inline', b: 'inline'}}));
    expect(state.icons).toEqual({a: 'json', b: 'inline'});
  });

  it("icons.json arrivato dopo sovrascrive l'icona inline", () => {
    let state = iconsReducer(initialState, addIcons({icons: {a: 'inline'}}));
    state = iconsReducer(state, loadIconsSuccess({icons: {a: 'json'}}));
    expect(state.icons).toEqual({a: 'json'});
  });

  it('loadIconsSuccess non cancella le icone inline con nome diverso', () => {
    let state = iconsReducer(initialState, addIcons({icons: {b: 'inline'}}));
    state = iconsReducer(state, loadIconsSuccess({icons: {a: 'json'}}));
    expect(state.icons).toEqual({a: 'json', b: 'inline'});
  });
});
