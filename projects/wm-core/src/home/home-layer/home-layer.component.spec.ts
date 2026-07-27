import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {ILAYER} from '@wm-core/types/config';

import {WmHomeLayerComponent} from './home-layer.component';
import {LayerFavoriteService} from '../../services/layer-favorite.service';

/**
 * La logica di toggle/toast/evento PostHog è centralizzata in
 * `LayerFavoriteService.toggleWithFeedback()` (vedi il suo spec dedicato) — qui si
 * verifica solo che il componente la richiami correttamente.
 */
describe('WmHomeLayerComponent — preferiti (oc:8176)', () => {
  const fakeLayer: ILAYER = {id: '7', title: 'Cammino dettaglio'} as any;

  let component: WmHomeLayerComponent;
  let favoriteSvcSpy: jasmine.SpyObj<LayerFavoriteService>;

  function createComponent(): WmHomeLayerComponent {
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

    return new WmHomeLayerComponent(storeSpy, langSvcSpy, {markForCheck: () => {}} as any, favoriteSvcSpy);
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
