import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';
import {IHORIZONTALSCROLLBOX, ILAYER, ISLUGBOX} from 'wm-core/types/config';

const exampleImg: string = 'https://picsum.photos/200/300?random=1';
const exampleImg2: string = 'https://picsum.photos/200/300?random=2';
const exampleImg3: string = 'https://picsum.photos/200/300?random=3';

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
  name: 'name',
  id: 1,
  taxonomyActivities: ['taxonomy activities'],
  taxonomyWheres: ['taxonomy wheres'],
  layers: [1],
};

export const exampleHorizontalScrollBox: IHORIZONTALSCROLLBOX = {
  box_type: 'horizontal_scroll',
  item_type: 'exampleItemType',
  title: 'Titolo della Scroll Box',
  items: [
    {
      title: 'Titolo Elemento 1',
      image_url: exampleImg,
      res: {key: 'value1'},
    },
    {
      title: 'Titolo Elemento 2',
      image_url: exampleImg2,
      res: {key: 'value2'},
    },
    {
      title: 'Titolo Elemento 3',
      image_url: exampleImg3,
      res: {key: 'value3'},
    },
  ],
  image_url: exampleImg,
};

export const exampleSlugBox: ISLUGBOX = {
  box_type: 'slug',
  title: 'Titolo Slug Box',
  slug: 'sono slug box',
  image_url: exampleImg,
};
