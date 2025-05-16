import {Component, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent as BBaseBoxComponent} from '../box';
import {ISLUGBOX} from '../../types/config';

@Component({
  selector: 'wm-slug-box',
  templateUrl: './slug-box.component.html',
  styleUrls: ['./slug-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SlugBoxComponent extends BBaseBoxComponent<ISLUGBOX> {}
