import {
  ChangeDetectorRef,
  Directive,
  Inject,
  Input,
  OnChanges,
  Optional,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseBoxComponent} from '../box';
import {ILAYERBOX} from '../../types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {confOPTIONSShowFavorites} from '@wm-core/store/conf/conf.selector';

/**
 * Logica condivisa fra `wm-layer-box` di default e la sua variante camminiditalia (oc:8701):
 * preferiti, click e evento PostHog. Ogni sottoclasse dichiara `selector`, `templateUrl` e
 * `styleUrls`; la variante aggiunge l'anello del passaporto.
 *
 * `@Directive()` astratta, come `BaseBoxComponent` che estende: serve agli `@Input` e genera la
 * factory DI (`ɵfac`) da cui le sottoclassi ereditano i parametri del costruttore. Senza decorator
 * l'errore (`NG0202`) comparirebbe solo a runtime; la guardia è in `layer-box-base.component.spec.ts`.
 */
@Directive()
export abstract class LayerBoxBaseComponent
  extends BaseBoxComponent<ILAYERBOX>
  implements OnChanges
{
  @Input() showBadge = true;
  @Input() useTotal = false;
  /**
   * Di default il cuoricino è di sola lettura (nessun toggle) — impostare a `true`
   * per abilitare like/dislike direttamente dal box. Oggi tutti i consumer noti
   * (home-landing, home-result, tab "Cammini" in FavouritesPage) lo impostano a
   * `true`; il default `false` resta come rete di sicurezza per consumer futuri
   * non ancora aggiornati esplicitamente.
   */
  @Input() favoriteInteractive = false;

  isFavorite$: Observable<boolean>;
  showFavoriteHeart$: Observable<boolean>;
  isTogglingFavorite = false;

  constructor(
    langSvc: LangService,
    cdr: ChangeDetectorRef,
    store: Store,
    protected _layerFavoriteSvc: LayerFavoriteService,
    @Optional() @Inject(POSTHOG_CLIENT) protected _posthogClient?: WmPosthogClient,
  ) {
    super(langSvc, cdr, store);
  }

  /** Ricalcola stato e visibilità del cuoricino quando cambia il layer. */
  ngOnChanges(): void {
    if (this.data?.layer?.id != null) {
      this.isFavorite$ = this._layerFavoriteSvc.isFavorite$(this.data.layer.id);
      this.showFavoriteHeart$ = combineLatest([
        this._store.select(isLogged),
        this._store.select(confOPTIONSShowFavorites),
      ]).pipe(map(([logged, enabled]) => logged && enabled));
    }
  }

  /**
   * Tap sul cuoricino: con `favoriteInteractive` aggiunge o toglie il layer dai preferiti, senza
   * aprire la card.
   *
   * @param event Evento del tap.
   */
  async onFavoriteClick(event: Event): Promise<void> {
    if (!this.favoriteInteractive) {
      return;
    }
    event.stopPropagation();
    const layer = this.data?.layer;
    if (!layer?.id || this._layerFavoriteSvc.isPending(layer.id)) {
      return;
    }

    this.isTogglingFavorite = true;
    this._cdr.markForCheck();
    await this._layerFavoriteSvc.toggleWithFeedback(layer);
    this.isTogglingFavorite = false;
    this._cdr.markForCheck();
  }

  /** Tap sulla card: registra l'evento `layerOpened` su PostHog e lo propaga. */
  onClick(): void {
    if (this._posthogClient && this.data?.layer) {
      const layerId = `${this.data.layer.id}`;
      const rawTitle = this.data.layer.title ?? this.data.title ?? '';
      const layerName =
        typeof rawTitle === 'string'
          ? rawTitle
          : rawTitle.it ?? Object.values(rawTitle).find(v => v) ?? '';
      this._posthogClient.capture('layerOpened', {
        layer_name: layerName,
        layer_label: `${layerId} - ${layerName}`,
      });
    }
    this.clickEVT.emit();
  }
}
