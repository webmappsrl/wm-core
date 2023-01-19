import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {ITRACKBOX} from '../../types/config';
import {BaseBoxComponent as BBaseBoxComponent} from '../box';

@Component({
  selector: 'wm-track-box',
  templateUrl: './track-box.component.html',
  styleUrls: ['./track-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackBoxComponent extends BBaseBoxComponent<ITRACKBOX> {}
