import {IGeojsonProperties} from '../types/model';
import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'wm-tab-howto',
  templateUrl: './tab-howto.component.html',
  styleUrls: ['./tab-howto.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmTabHowtoComponent {
  @Input() properties: IGeojsonProperties;

  constructor() {}
}
