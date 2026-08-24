import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {ILAYER} from '@wm-core/types/config';
import {LayerFavoriteService} from '../../services/layer-favorite.service';
import {WmHomeLayerBaseComponent} from './home-layer-base.component';

const fakeLayer: ILAYER = {id: '7', title: 'Cammino dettaglio'} as any;

/**
 * Suite di test condivisa per il comportamento preferiti (oc:8176), eseguita
 * contro ogni variante per-shard di `wm-home-layer` che estende
 * `WmHomeLayerBaseComponent` (oc:8391) — la logica testata vive tutta nella
 * Base, quindi un'unica suite parametrizzata sul costruttore della variante
 * garantisce che tutte restino in sync, invece di duplicare i test case per
 * ognuna.
 *
 * @param describeLabel Etichetta descrittiva della variante in test (usata nel `describe`).
 * @param ComponentCtor Costruttore della variante da testare (stessa firma della Base).
 */
export function describeHomeLayerFavoriteBehavior(
  describeLabel: string,
  ComponentCtor: new (
    store: Store,
    langSvc: LangService,
    cdr: {markForCheck: () => void},
    layerFavoriteSvc: LayerFavoriteService,
  ) => WmHomeLayerBaseComponent,
): void {
  describe(`${describeLabel} — preferiti (oc:8176/oc:8391)`, () => {
    let component: WmHomeLayerBaseComponent;
    let favoriteSvcSpy: jasmine.SpyObj<LayerFavoriteService>;

    function createComponent(): WmHomeLayerBaseComponent {
      const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
      storeSpy.select.and.returnValue(of(fakeLayer));
      const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
      (langSvcSpy as any).onLangChange = of();
      favoriteSvcSpy = jasmine.createSpyObj<LayerFavoriteService>('LayerFavoriteService', [
        'isFavorite$',
        'toggleWithFeedback',
        'isPending',
      ]);
      favoriteSvcSpy.isFavorite$.and.returnValue(of(false));
      favoriteSvcSpy.toggleWithFeedback.and.resolveTo();

      return new ComponentCtor(storeSpy, langSvcSpy, {markForCheck: () => {}} as any, favoriteSvcSpy);
    }

    beforeEach(() => {
      component = createComponent();
    });

    it('chiama toggleWithFeedback con il layer corrente e stopPropagation sul tap', async () => {
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      await component.onFavoriteClick(event, fakeLayer);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(favoriteSvcSpy.toggleWithFeedback).toHaveBeenCalledWith(fakeLayer);
    });

    it('non richiama toggleWithFeedback se una richiesta per lo stesso layer è già in corso', async () => {
      favoriteSvcSpy.isPending.and.returnValue(true);
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      await component.onFavoriteClick(event, fakeLayer);

      expect(favoriteSvcSpy.toggleWithFeedback).not.toHaveBeenCalled();
    });

    it('imposta e resetta isTogglingFavorite intorno a toggleWithFeedback', async () => {
      let resolveToggle: () => void;
      favoriteSvcSpy.toggleWithFeedback.and.returnValue(
        new Promise<void>(resolve => (resolveToggle = resolve)),
      );
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);

      const clickPromise = component.onFavoriteClick(event, fakeLayer);
      expect(component.isTogglingFavorite).toBeTrue();

      resolveToggle();
      await clickPromise;
      expect(component.isTogglingFavorite).toBeFalse();
    });
  });
}
