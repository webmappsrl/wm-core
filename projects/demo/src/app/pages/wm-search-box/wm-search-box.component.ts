import {Component} from '@angular/core';
import {exampleCard} from 'projects/demo/src/demo-utils';
import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';

@Component({
  selector: 'app-wm-search-box',
  templateUrl: './wm-search-box.component.html',
  styleUrls: ['./wm-search-box.component.scss'],
})
export class WmSearchBoxComponent {
  demoCard: IHIT = exampleCard;
}
