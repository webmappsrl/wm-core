import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {layerFeaturesCount, layerFeaturesTotalCount} from '@wm-core/store/features/ec/ec.selector';
import {Store} from '@ngrx/store';
import {LayerFeaturesCount} from '@wm-types/feature';
import {Observable} from 'rxjs';

@Component({
  standalone: false,
  selector: 'wm-layer-features-counter-badge',
  templateUrl: './layer-features-counter-badge.component.html',
  styleUrls: ['./layer-features-counter-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmLayerFeaturesCounterBadgeComponent {
  @Input() layerId: string;
  @Input() useTotal = false;

  layerFeaturesCount$: Observable<LayerFeaturesCount> = this._store.select(layerFeaturesCount);
  layerFeaturesTotalCount$: Observable<LayerFeaturesCount> = this._store.select(layerFeaturesTotalCount);

  constructor(private _store: Store) {}
}
