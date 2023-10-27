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
    'wm-tab-howto',
  ];

  boxComponents = this.allComponents.filter(component => component.includes('box'));
  tabComponents = this.allComponents.filter(component => component.includes('tab'));
  otherComponents: string[] = [];

  selectedComponent: string = '';
  @Output() componentSelected = new EventEmitter<string>();

  constructor() {
    this.boxComponents.sort();
    this.tabComponents.sort();
    this.filterOtherComponents();
  }

  filterOtherComponents() {
    this.otherComponents = this.allComponents.filter(
      component => !component.includes('box') && !component.includes('tab'),
    );
  }

  showComponent(component: string) {
    this.selectedComponent = component;
    this.componentSelected.emit(this.selectedComponent);
  }
}
