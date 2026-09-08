import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {ILAYER} from '@wm-core/types/config';

import {LayerBoxComponent} from './layer-box.component';
import {LayerFavoriteService} from '../../services/layer-favorite.service';

/**
 * Il cuoricino su wm-layer-box è di sola lettura per default (card nella home/lista) —
 * `favoriteInteractive=true` lo rende un toggle vero e proprio (usato dal tab
 * "Cammini" della pagina Preferiti, dove serve poter rimuovere un preferito).
 * La logica di toggle/toast/evento PostHog è centralizzata in
 * `LayerFavoriteService.toggleWithFeedback()` (vedi il suo spec dedicato) — qui si
 * verifica solo che il componente la richiami correttamente in base al flag.
 */
describe('LayerBoxComponent — preferiti (oc:8176)', () => {
  const fakeLayer: ILAYER = {id: '42', title: 'Cammino di prova'} as any;

  let favoriteSvcSpy: jasmine.SpyObj<LayerFavoriteService>;
  let posthogSpy: jasmine.SpyObj<{capture: (...args: any[]) => any}>;

  function createComponent(favoriteInteractive: boolean): LayerBoxComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(true));
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    (langSvcSpy as any).onLangChange = of();
    favoriteSvcSpy = jasmine.createSpyObj<LayerFavoriteService>('LayerFavoriteService', [
      'isFavorite$',
      'toggleWithFeedback',
      'isPending',
    ]);
    favoriteSvcSpy.isFavorite$.and.returnValue(of(false));
    favoriteSvcSpy.toggleWithFeedback.and.resolveTo();
    posthogSpy = jasmine.createSpyObj('WmPosthogClient', ['capture']);

    const instance = new LayerBoxComponent(
      langSvcSpy,
      {markForCheck: () => {}} as any,
      storeSpy,
      favoriteSvcSpy,
      posthogSpy as any,
    );
    instance.data = {layer: fakeLayer, title: 'Cammino di prova'} as any;
    instance.favoriteInteractive = favoriteInteractive;
    instance.ngOnChanges();

    return instance;
  }

  describe('sola lettura (default, card in home/lista)', () => {
    it('non richiama toggleWithFeedback sul tap del cuoricino', async () => {
      const component = createComponent(false);
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      await component.onFavoriteClick(event);

      expect(favoriteSvcSpy.toggleWithFeedback).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    });
  });

  describe('interattivo (favoriteInteractive=true, tab Cammini in Preferiti)', () => {
    it('chiama stopPropagation e toggleWithFeedback sul tap del cuoricino', async () => {
      const component = createComponent(true);
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      await component.onFavoriteClick(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(favoriteSvcSpy.toggleWithFeedback).toHaveBeenCalledWith(fakeLayer);
    });

    it('non richiama toggleWithFeedback se una richiesta per lo stesso layer è già in corso', async () => {
      const component = createComponent(true);
      favoriteSvcSpy.isPending.and.returnValue(true);
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      await component.onFavoriteClick(event);

      expect(favoriteSvcSpy.toggleWithFeedback).not.toHaveBeenCalled();
    });

    it('imposta e resetta isTogglingFavorite intorno a toggleWithFeedback', async () => {
      const component = createComponent(true);
      let resolveToggle: () => void;
      favoriteSvcSpy.toggleWithFeedback.and.returnValue(
        new Promise<void>(resolve => (resolveToggle = resolve)),
      );
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      const clickPromise = component.onFavoriteClick(event);
      expect(component.isTogglingFavorite).toBeTrue();

      resolveToggle();
      await clickPromise;
      expect(component.isTogglingFavorite).toBeFalse();
    });
  });

  describe('onClick() — evento layerOpened (invariato, non legato ai preferiti)', () => {
    it('emette layerOpened con layer_id e nome', () => {
      const component = createComponent(false);

      component.onClick();

      expect(posthogSpy.capture).toHaveBeenCalledWith(
        'layerOpened',
        jasmine.objectContaining({layer_label: jasmine.stringMatching('42')}),
      );
    });
  });
});
