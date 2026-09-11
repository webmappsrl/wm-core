import {ChangeDetectorRef, Injectable, OnDestroy} from '@angular/core';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {ecLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {confOPTIONSShowFavorites} from '@wm-core/store/conf/conf.selector';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {ILAYER} from '@wm-core/types/config';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {combineLatest, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';

/**
 * Logica condivisa tra il componente `wm-home-layer` di default e la sua
 * variante per-shard (`.camminiditalia`, oc:8391) — plain class, nessun
 * decorator `@Component`: ciascuna sottoclasse dichiara il proprio
 * `templateUrl`/`styleUrls`/`selector`.
 *
 * `@Injectable()` è necessario anche se questa classe non viene mai iniettata
 * direttamente: senza un decorator Angular, il compilatore non genera la
 * factory DI (`ɵfac`) da cui le sottoclassi (`WmHomeLayerComponent` e la sua
 * variante `.camminiditalia`) erediscono i tipi dei parametri del
 * costruttore — la sua assenza produce `NG0202` a runtime (non rilevato dagli
 * spec esistenti, che istanziano il componente con `new`, bypassando
 * Angular DI).
 */
@Injectable()
export abstract class WmHomeLayerBaseComponent implements OnDestroy {
  layer$ = this._store.select(ecLayer);
  showFavoriteHeart$ = combineLatest([
    this._store.select(isLogged),
    this._store.select(confOPTIONSShowFavorites),
  ]).pipe(map(([logged, enabled]) => logged && enabled));

  isTogglingFavorite = false;

  private _langChangeSub: Subscription;

  constructor(
    protected _store: Store,
    protected _langSvc: LangService,
    protected _cdr: ChangeDetectorRef,
    protected _layerFavoriteSvc: LayerFavoriteService,
  ) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  /**
   * Osservabile reattivo che indica se il layer passato è tra i preferiti dell'utente.
   *
   * @param layer Layer di cui verificare lo stato di preferito.
   * @returns Observable che emette `true` se il layer è tra i preferiti.
   */
  isFavorite$(layer: ILAYER) {
    return this._layerFavoriteSvc.isFavorite$(layer.id);
  }

  /**
   * Gestisce il tap sul cuoricino preferiti: blocca la propagazione dell'evento ed
   * effettua il toggle dei preferiti per il layer corrente (guardia anti-doppio-tap,
   * toast di errore, evento PostHog `layerFavorited` — centralizzati in
   * `LayerFavoriteService.toggleWithFeedback()`).
   *
   * @param event Evento click originato dal tap sul cuoricino.
   * @param layer Layer corrente su cui alternare lo stato di preferito.
   */
  async onFavoriteClick(event: Event, layer: ILAYER): Promise<void> {
    event.stopPropagation();
    if (!layer?.id || this._layerFavoriteSvc.isPending(layer.id)) {
      return;
    }

    this.isTogglingFavorite = true;
    this._cdr.markForCheck();
    await this._layerFavoriteSvc.toggleWithFeedback(layer);
    this.isTogglingFavorite = false;
    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this._langChangeSub?.unsubscribe();
  }
}
