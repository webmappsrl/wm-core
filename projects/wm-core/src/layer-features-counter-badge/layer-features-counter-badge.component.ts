import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {layerFeaturesCount} from '@wm-core/store/features/ec/ec.selector';
import {Store} from '@ngrx/store';
import {LayerFeaturesCount} from '@wm-types/feature';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-layer-features-counter-badge',
  templateUrl: './layer-features-counter-badge.component.html',
  styleUrls: ['./layer-features-counter-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmLayerFeaturesCounterBadgeComponent {
  @Input() layerId: string;

  layerFeaturesCount$: Observable<LayerFeaturesCount> = this._store.select(layerFeaturesCount);

  constructor(private _store: Store) {}
}
