import {Component} from '@angular/core';
import {exampleCard} from 'projects/demo/src/demo-utils';
import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';

@Component({
  selector: 'app-wm-poi-box',
  templateUrl: './wm-poi-box.component.html',
  styleUrls: ['./wm-poi-box.component.scss'],
})
export class WmPoiBoxComponent {
  demoCard: IHIT = exampleCard;
}
