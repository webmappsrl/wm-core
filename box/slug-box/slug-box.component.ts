import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent as BBaseBoxComponent} from '../box';

@Component({
  selector: 'wm-slug-box',
  templateUrl: './slug-box.component.html',
  styleUrls: ['./slug-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SlugBoxComponent extends BBaseBoxComponent<ISLUGBOX> {}
