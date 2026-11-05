import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
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
  constructor(store: Store) {
    super(store);
  }
}
