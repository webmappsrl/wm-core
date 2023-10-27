import {IHIT} from 'wm-core/pipes/wm-get-data.pipe';
import {IHORIZONTALSCROLLBOX, ILAYER, ISLUGBOX} from 'wm-core/types/config';
import {IGeojsonProperties} from 'wm-core/types/model';

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

export const exampleProperties: IGeojsonProperties = {
  ascent: 500,
  audio: {en: 'audio_url_en'},
  created_at: new Date(),
  descent: 300,
  description: {en: 'description_en'},
  difficulty: {en: 'easy'},
  distance: 10,
  distance_comp: 9,
  duration: {
    hiking: {
      forward: 2,
      backward: 3,
    },
  },
  ele_from: 100,
  ele_max: 600,
  ele_min: 50,
  ele_to: 400,
  excerpt: {en: 'excerpt_en'},
  feature_image: {
    api_url: 'api_url',
    caption: 'caption',
    id: 1,
    sizes: {
      '108x148': exampleImg,
      '108x137': exampleImg,
      '225x100': exampleImg,
      '250x150': exampleImg,
      '118x138': exampleImg,
      '108x139': exampleImg,
      '118x117': exampleImg,
      '335x250': exampleImg,
      '400x200': exampleImg,
      '1440x500': exampleImg,
    },
    url: 'url',
  },
  geojson_url: 'geojson_url',
  gpx_url: 'gpx_url',
  id: 1,
  image: {
    api_url: 'api_url',
    caption: 'caption',
    id: 2,
    sizes: {
      '108x148': exampleImg,
      '108x137': exampleImg,
      '225x100': exampleImg,
      '250x150': exampleImg,
      '118x138': exampleImg,
      '108x139': exampleImg,
      '118x117': exampleImg,
      '335x250': exampleImg,
      '400x200': exampleImg,
      '1440x500': exampleImg,
    },
    url: 'url',
  },
  image_gallery: [
    {
      api_url: 'api_url',
      caption: 'caption',
      id: 3,
      sizes: {
        '108x148': exampleImg,
        '108x137': exampleImg,
        '225x100': exampleImg,
        '250x150': exampleImg,
        '118x138': exampleImg,
        '108x139': exampleImg,
        '118x117': exampleImg,
        '335x250': exampleImg,
        '400x200': exampleImg,
        '1440x500': exampleImg,
      },
      url: 'url',
    },
  ],
  import_method: 'method',
  kml_url: 'kml_url',
  mbtiles: ['mbtiles1', 'mbtiles2'],
  name: {en: 'name_en'},
  source: 'source',
  source_id: 'source_id',
  taxonomy: {
    activity: ['activity1', 'activity2'],
    where: ['where1', 'where2'],
    poi_type: {},
  },
  updated_at: new Date(),
  user_id: 1,
};
