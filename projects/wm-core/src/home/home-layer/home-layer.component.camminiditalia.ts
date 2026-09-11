import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {WmHomeLayerBaseComponent} from './home-layer-base.component';

@Component({
  standalone: false,
  selector: 'wm-home-layer',
  templateUrl: './home-layer.component.html',
  styleUrls: ['./home-layer.component.camminiditalia.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLayerComponent extends WmHomeLayerBaseComponent {}
