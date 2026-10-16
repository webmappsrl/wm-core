import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {LayerBoxBaseComponent} from './layer-box-base.component';

@Component({
  standalone: false,
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends LayerBoxBaseComponent {}
