import {Component} from '@angular/core';
import {exampleHorizontalScrollBox} from 'projects/demo/src/demo-utils';
import {IHORIZONTALSCROLLBOX} from 'wm-core/types/config';

@Component({
  selector: 'app-wm-horizontal-scroll-box',
  templateUrl: './wm-horizontal-scroll-box.component.html',
  styleUrls: ['./wm-horizontal-scroll-box.component.scss'],
})
export class WmHorizontalScrollBoxComponent {
  demoScrollBox: IHORIZONTALSCROLLBOX = exampleHorizontalScrollBox;
}
