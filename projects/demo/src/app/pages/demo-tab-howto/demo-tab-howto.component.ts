import {Component} from '@angular/core';
import {exampleProperties} from 'projects/demo/src/demo-utils';
import {IGeojsonProperties} from 'wm-core/types/model';

@Component({
  selector: 'app-demo-tab-howto',
  templateUrl: './demo-tab-howto.component.html',
  styleUrls: ['./demo-tab-howto.component.scss'],
})
export class DemoTabHowtoComponent {
  demoProperties: IGeojsonProperties = exampleProperties;
}
