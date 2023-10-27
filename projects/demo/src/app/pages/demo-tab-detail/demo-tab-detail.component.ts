import {Component} from '@angular/core';
import {exampleProperties} from 'projects/demo/src/demo-utils';
import {IGeojsonProperties} from 'wm-core/types/model';

@Component({
  selector: 'app-demo-tab-detail',
  templateUrl: './demo-tab-detail.component.html',
  styleUrls: ['./demo-tab-detail.component.scss'],
})
export class DemoTabDetailComponent {
  demoProperties: IGeojsonProperties = exampleProperties;
}
