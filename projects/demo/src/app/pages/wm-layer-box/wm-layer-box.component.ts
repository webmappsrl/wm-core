import {Component} from '@angular/core';
import {exampleLayer} from 'projects/demo/src/demo-utils';
import {ILAYER} from 'wm-core/types/config';

@Component({
  selector: 'app-wm-layer-box',
  templateUrl: './wm-layer-box.component.html',
  styleUrls: ['./wm-layer-box.component.scss'],
})
export class WmLayerBoxComponent {
  demoLayer: ILAYER = exampleLayer;
}
