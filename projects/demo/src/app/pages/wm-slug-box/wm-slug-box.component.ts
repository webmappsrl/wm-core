import {Component} from '@angular/core';
import {exampleSlugBox} from 'projects/demo/src/demo-utils';
import {ISLUGBOX} from 'wm-core/types/config';

@Component({
  selector: 'app-wm-slug-box',
  templateUrl: './wm-slug-box.component.html',
  styleUrls: ['./wm-slug-box.component.scss'],
})
export class WmSlugBoxComponent {
  demoSlugBox: ISLUGBOX = exampleSlugBox;
}
