import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent as BBaseBoxComponent} from '../box';

@Component({
  selector: 'wm-base-box',
  templateUrl: './base-box.component.html',
  styleUrls: ['./base-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BaseBoxComponent extends BBaseBoxComponent<IHOMEBASEITEM> {}
