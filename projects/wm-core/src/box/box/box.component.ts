import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import { IHOMEBASEITEM } from '../../types/config';

@Component({
  standalone: false,
  selector: 'wm-box',
  templateUrl: './box.component.html',
  styleUrls: ['./box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BoxComponent extends BaseBoxComponent<IHOMEBASEITEM> {}
