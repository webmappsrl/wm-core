import {confOPTIONSShowFavorites} from './conf.selector';

describe('confOPTIONSShowFavorites', () => {
  it('restituisce true quando OPTIONS.showFavorites è true', () => {
    const state = {conf: {OPTIONS: {showFavorites: true}}} as any;
    expect(confOPTIONSShowFavorites.projector(state.conf.OPTIONS)).toBe(true);
  });

  it('restituisce false quando OPTIONS.showFavorites è assente', () => {
    const state = {conf: {OPTIONS: {}}} as any;
    expect(confOPTIONSShowFavorites.projector(state.conf.OPTIONS)).toBe(false);
  });
});
