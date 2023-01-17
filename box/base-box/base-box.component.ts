import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {IHOMEITEM, ITRACKBOX} from 'src/app/types/config';
import {BaseBoxComponent as BBaseBoxComponent} from '../box';

@Component({
  selector: 'webmapp-base-box',
  templateUrl: './base-box.component.html',
  styleUrls: ['./base-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BaseBoxComponent extends BBaseBoxComponent<IHOMEITEM | ITRACKBOX> {}
