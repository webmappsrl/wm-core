import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {ILAYER} from '@wm-core/types/config';

import {LayerFavoriteService} from '../../services/layer-favorite.service';

/** Componente sotto test: l'originale o la variante camminiditalia (oc:8701). */
export interface LayerBoxUnderTest {
  data: any;
  favoriteInteractive: boolean;
  isTogglingFavorite: boolean;
  ngOnChanges(): void;
  onFavoriteClick(event: Event): Promise<void>;
  onClick(): void;
}

/** Costruisce il componente con le dipendenze dei preferiti; le altre le aggiunge la variante. */
export type LayerBoxFactory = (
  langSvc: LangService,
  cdr: any,
  store: Store,
  favoriteSvc: LayerFavoriteService,
  posthog: any,
) => LayerBoxUnderTest;

/**
 * Suite dei preferiti (oc:8176) eseguita sull'originale e sulla variante camminiditalia di
 * `wm-layer-box` (oc:8701): la logica sta in `LayerBoxBaseComponent`, e la suite verifica che
 * entrambe le sottoclassi la ereditino e la chiamino con le dipendenze giuste.
 *
 * Il cuoricino è di sola lettura per default (card nella home/lista); `favoriteInteractive=true`
 * lo rende un toggle (tab «Cammini» della pagina Preferiti). Toggle, toast ed evento PostHog sono
 * in `LayerFavoriteService.toggleWithFeedback()`, con il suo spec: qui si verifica solo che il
 * componente lo richiami in base al flag.
 *
 * @param describeLabel Etichetta della variante in test.
 * @param factory Costruisce il componente.
 */
export function describeLayerBoxFavoriteBehavior(describeLabel: string, factory: LayerBoxFactory): void {
describe(describeLabel, () => {
  const fakeLayer: ILAYER = {id: '42', title: 'Cammino di prova'} as any;

  let favoriteSvcSpy: jasmine.SpyObj<LayerFavoriteService>;
  let posthogSpy: jasmine.SpyObj<{capture: (...args: any[]) => any}>;

  function createComponent(favoriteInteractive: boolean): LayerBoxUnderTest {
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

    const instance = factory(
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
}
