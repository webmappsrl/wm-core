import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  OnChanges,
  Optional,
  ViewEncapsulation,
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

@Component({
  standalone: false,
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends BaseBoxComponent<ILAYERBOX> implements OnChanges {
  @Input() showBadge = true;
  @Input() useTotal = false;
  /**
   * Di default il cuoricino è di sola lettura (indicatore di stato, card nella
   * home/lista) — impostare a `true` solo dove serve poter rimuovere/aggiungere
   * il preferito direttamente dal box (es. tab "Cammini" in FavouritesPage).
   */
  @Input() favoriteInteractive = false;

  isFavorite$: Observable<boolean>;
  showFavoriteHeart$: Observable<boolean>;
  isTogglingFavorite = false;

  constructor(
    langSvc: LangService,
    cdr: ChangeDetectorRef,
    store: Store,
    private _layerFavoriteSvc: LayerFavoriteService,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    super(langSvc, cdr, store);
  }

  ngOnChanges(): void {
    if (this.data?.layer?.id != null) {
      this.isFavorite$ = this._layerFavoriteSvc.isFavorite$(this.data.layer.id);
      this.showFavoriteHeart$ = combineLatest([
        this._store.select(isLogged),
        this._store.select(confOPTIONSShowFavorites),
      ]).pipe(map(([logged, enabled]) => logged && enabled));
    }
  }

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
