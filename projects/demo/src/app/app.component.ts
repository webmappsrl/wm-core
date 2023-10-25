import {Component} from '@angular/core';
import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';
import {ILAYER} from 'wm-core/types/config';
import {componentsList, exampleCard, exampleLayer} from '../demo-utils';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  components = componentsList;
  demoCard: IHIT = exampleCard;
  demoLayer: ILAYER = exampleLayer;
  selectedComponent: string = '';

  constructor() {
    this.components.sort();
  }

  showComponent(component: string) {
    this.selectedComponent = component;
  }
}
