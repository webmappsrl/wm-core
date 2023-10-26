import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-left-bar',
  templateUrl: './left-bar.component.html',
  styleUrls: ['./left-bar.component.scss'],
})
export class LeftBarComponent {
  allComponents = [
    'webmapp-title',
    'wm-layer-box',
    'wm-slug-box',
    'wm-status-filter',
    'wm-search-box',
    'wm-poi-box',
    'wm-horizontal-scroll-box',
    'wm-tab-detail',
  ];

  boxComponents = this.allComponents.filter(component => component.includes('box'));
  otherComponents = this.allComponents.filter(component => !component.includes('box'));

  selectedComponent: string = '';
  @Output() componentSelected = new EventEmitter<string>();

  constructor() {
    this.boxComponents.sort();
    this.otherComponents.sort();
  }

  showComponent(component: string) {
    this.selectedComponent = component;
    this.componentSelected.emit(this.selectedComponent);
  }
}
