import {Component} from '@angular/core';
import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';
import {ILAYER} from 'wm-core/types/config';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  exampleImg: string = 'https://picsum.photos/200/300';

  exampleLayer: ILAYER = {
    bbox: [0, 0, 0, 0],
    behaviour: {},
    data_use_bbox: true,
    data_use_only_my_data: true,
    description: 'Descrizione del layer',
    feature_image: this.exampleImg,
    id: 'id-unico',
    name: 'Nome del layer',
    style: {},
    subtitle: 'Sottotitolo del layer',
    title: 'Titolo del layer',
  };

  exampleCard: IHIT = {
    cai_scale: 'cai scale',
    feature_image: this.exampleImg,
    ref: 'ref',
    distance: 'distance',
    name: 'wm-search-box',
    id: 1,
    taxonomyActivities: ['taxonomy activities'],
    taxonomyWheres: ['taxonomy wheres'],
    layers: [1],
  };

  selectedComponent: string = '';
  title = 'demo';
  components = [
    {name: 'webmapp-title', label: 'webmapp-title'},
    {name: 'wm-layer-box', label: 'wm-layer-box'},
    {name: 'wm-slug-box', label: 'wm-slug-box'},
    {name: 'wm-status-filter', label: 'wm-status-filter'},
    {name: 'wm-search-box', label: 'wm-search-box'},
  ];

  constructor() {
    this.components.sort((a, b) => a.label.localeCompare(b.label));
  }

  showComponent(component: string) {
    this.selectedComponent = component;
  }
}
