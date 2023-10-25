import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-left-bar',
  templateUrl: './left-bar.component.html',
  styleUrls: ['./left-bar.component.scss'],
})
export class LeftBarComponent {
  components = [
    'webmapp-title',
    'wm-layer-box',
    'wm-slug-box',
    'wm-status-filter',
    'wm-search-box',
    'wm-poi-box',
    'wm-horizontal-scroll-box',
  ];
  selectedComponent: string = '';
  @Output() componentSelected = new EventEmitter<string>();

  constructor() {
    this.components.sort();
  }

  showComponent(component: string) {
    this.selectedComponent = component;
    this.componentSelected.emit(this.selectedComponent);
  }
}
