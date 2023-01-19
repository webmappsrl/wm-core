import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {ILAYERBOX} from '../../types/config';

@Component({
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends BaseBoxComponent<ILAYERBOX> {}
