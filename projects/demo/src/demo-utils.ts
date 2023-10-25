import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';
import {ILAYER} from 'wm-core/types/config';

const exampleImg: string = 'https://picsum.photos/200/300';

export const exampleLayer: ILAYER = {
  bbox: [0, 0, 0, 0],
  behaviour: {},
  data_use_bbox: true,
  data_use_only_my_data: true,
  description: 'Descrizione del layer',
  feature_image: exampleImg,
  id: 'id-unico',
  name: 'Nome del layer',
  style: {},
  subtitle: 'Sottotitolo del layer',
  title: 'Titolo del layer',
};

export const exampleCard: IHIT = {
  cai_scale: 'cai scale',
  feature_image: exampleImg,
  ref: 'ref',
  distance: 'distance',
  name: 'wm-search-box',
  id: 1,
  taxonomyActivities: ['taxonomy activities'],
  taxonomyWheres: ['taxonomy wheres'],
  layers: [1],
};

export const componentsList = [
  'webmapp-title',
  'wm-layer-box',
  'wm-slug-box',
  'wm-status-filter',
  'wm-search-box',
  'wm-poi-box',
];
