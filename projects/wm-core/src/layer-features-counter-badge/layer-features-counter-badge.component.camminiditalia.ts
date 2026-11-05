// Variante camminiditalia di wm-layer-features-counter-badge (oc:8918), attivata con
// `fileReplacements`: la logica comune sta in `LayerFeaturesCounterBadgeBaseComponent`, il template
// è quello di default. Il numero di tappe viene da `attributes.stage_count` del layer in config.
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {confMAPLayers} from '@wm-core/store/conf/conf.selector';
import {Observable, combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {LayerFeaturesCounterBadgeBaseComponent} from './layer-features-counter-badge-base.component';

@Component({
  standalone: false,
  selector: 'wm-layer-features-counter-badge',
  templateUrl: './layer-features-counter-badge.component.html',
  styleUrls: ['./layer-features-counter-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmLayerFeaturesCounterBadgeComponent extends LayerFeaturesCounterBadgeBaseComponent {
  override stageCount$: Observable<number | null>;

  constructor(store: Store) {
    super(store);
    this.stageCount$ = combineLatest([this._store.select(confMAPLayers), this._layerId$]).pipe(
      map(([layers, layerId]) => {
        const layer = (layers ?? []).find(l => layerId != null && Number(l.id) === Number(layerId));
        return layer?.attributes?.stage_count ?? null;
      }),
      distinctUntilChanged(),
    );
  }
}
