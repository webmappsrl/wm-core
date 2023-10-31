import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-left-bar',
  templateUrl: './left-bar.component.html',
  styleUrls: ['./left-bar.component.scss'],
})
export class LeftBarComponent {
  @Output() componentSelected = new EventEmitter<string>();

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
    'wm-tab-image-gallery',
    'wm-tab-description',
  ];
  boxComponents = this.allComponents.filter(component => component.includes('box'));
  otherComponents: string[] = [];
  selectedComponent: string = '';
  tabComponents = this.allComponents.filter(component => component.includes('tab'));

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
