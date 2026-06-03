import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent as BBaseBoxComponent} from '../box';
import { ITRACKBOX } from '../../types/config';

@Component({
  standalone: false,
  selector: 'wm-track-box',
  templateUrl: './track-box.component.html',
  styleUrls: ['./track-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackBoxComponent extends BBaseBoxComponent<ITRACKBOX> {}
