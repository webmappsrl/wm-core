interface PoiTypeTaxonomy {
  color: string;
  icon: string;
  id: number;
  identifier: string;
  image_url: string;
  name: iLocalString;
}
interface IGEOLOCATION {
  record: {
    enable: boolean;
  };
}

interface IAPP {
  appStoreUrl?: string;
  customerName?: string;
  geohubId: number;
  googlePlayUrl?: string;
  id?: string;
  name: string;
  poi_acquisition_form?: any;
  welcome?: string;
}

interface IConfig {
  APP: IAPP;
  GEOLOCATION?: IGEOLOCATION;
  PROJECT: IPROJECT;
}

interface ITHEME {
  danger?: string;
  dark?: string;
  defaultFeatureColor?: string;
  fontFamilyContent?: string;
  fontFamilyHeader?: string;
  fontLg?: string;
  fontMd?: string;
  fontSm?: string;
  fontXlg?: string;
  fontXsm?: string;
  fontXxlg?: string;
  fontXxxlg?: string;
  light?: string;
  medium?: string;
  primary?: string;
  secondary?: string;
  select?: string;
  success?: string;
  tertiary?: string;
  theme?: string;
  warning?: string;
}
interface ILANGUAGES {
  available?: string[];
  default?: string;
}

interface IHOMEOLD {
  color?: string;
  features?: string[];
  noElements?: string;
  subtitle?: string;
  taxonomy?: string;
  terms?: any[];
  title?: string;
  types?: string[];
  url?: string;
  view: string;
}

type IBOX = {
  box_type: 'title' | 'layer' | 'track' | 'base' | 'external_url' | 'slug' | 'poi_type_filter';
  title: iLocalString | string;
};
type ITITLEBOX = IBOX & {
  box_type: 'title';
};
type ILAYERBOX = IBOX & {
  box_type: 'layer';
  layer: ILAYER;
  icon?: string;
  color?: string;
};

type ITRACKBOX = IBOX & {
  box_type: 'track';
  track_id: number;
  image_url: string;
};

type IHOMEBASEITEM = {
  title: iLocalString | string;
  image_url: string;
};
type IEXTERNALURLBOX = IHOMEBASEITEM & {
  box_type: 'external_url';
  url: string;
};
type ISLUGBOX = IHOMEBASEITEM & {
  box_type: 'slug';
  slug: string;
};
type IPOITYPEFILTERBOX = {
  box_type: 'poi_type_filter';
} & PoiTypeTaxonomy;

type IHOMEITEMTRACK = IHOMEBASEITEM & {
  track_id: number;
  taxonomy_activities: string[];
  taaxonomy_where: string[];
  distance: string;
  cai_scale: string;
};
type IHOMEITEMURL = IHOMEBASEITEM & {
  url: string;
};
type IHOMEITEM = IHOMEITEMTRACK | IHOMEITEMURL;
type IBASEBOX = IBOX & {
  box_type: 'base';
  items: IHOMEITEMTRACK[];
  image_url?: string;
};
type IHOME =
  | ITITLEBOX
  | ILAYERBOX
  | IBASEBOX
  | IEXTERNALURLBOX
  | ISLUGBOX
  | ITRACKBOX
  | IPOITYPEFILTERBOX;

interface IOPTIONS {
  addArrowsOverTracks: boolean;
  baseUrl: string;
  beBaseUrl?: string;
  caiScaleStyleZoom: number;
  clustering: ICLUSTERING;
  customBackgroundImageUrl?: string;
  detailsMapBehaviour?: IDETAILSMAPBEHAVIOUR;
  downloadFullGemoetryRouteIndex: boolean;
  downloadRoutesInWebapp: boolean;
  download_track_enable?: boolean;
  enableTrackAdoption: boolean;
  forceDefaultFeatureColor: boolean;
  forceWelcomePagePopup: boolean;
  galleryAnimationType?: string;
  hideDisclaimer: boolean;
  hideFilters: boolean;
  hideGlobalMap: boolean;
  hideNewsletterInSignup: boolean;
  hideSearch: boolean;
  highlightMapButton: boolean;
  highlightReadMoreButton: boolean;
  mapAttributions?: IMAPATTRIBUTION[];
  maxFitZoom?: number;
  minDynamicOverlayLayersZoom: number;
  passwordRecoveryUrl: string;
  poiIconRadius: number;
  poiIconZoom: number;
  poiLabelMinZoom: number;
  poiMaxRadius: number;
  poiMinRadius: number;
  poiMinZoom: number;
  poiSelectedRadius: number;
  print_track_enable?: boolean;
  privacyUrl: string;
  resetFiltersAtStartup: boolean;
  showAppDownloadButtons: IAPPDOWNLOADBUTTONS;
  showDifficultyLegend: boolean;
  showEditLink: boolean;
  showHelp: boolean;
  showMapViewfinder: boolean;
  showPoiListOffline: boolean;
  showTrackRefLabel: boolean;
  skipRouteIndexDownload: boolean;
  startFiltersDisabled: boolean;
  startUrl: string;
  termsAndConditionsUrl?: string;
  trackAdoptionUrl?: string;
  trackReconnaissanceUrl?: string;
  trackRefLabelZoom: number;
  useCaiScaleStyle: boolean;
  useFeatureClassicSelectionStyle: boolean;
  voucherUrl?: string;
}
interface IAUTH {
  customCreatePostRoles?: boolean;
  enable?: boolean;
  facebook?: IFACEBOOK;
  force?: boolean;
  google?: IGOOGLE;
  hideCountry?: boolean;
  loginToGeohub?: boolean;
  showAtStartup?: boolean;
  skipToDownloadPublicRoute?: boolean;
}
interface IPROJECT {
  HTML: string;
}
interface iLocalString {
  en?: string;
  it?: string;
}
interface IOVERLAYERS {
  label: iLocalString;
  icon: string;
  url: string;
}
interface IOVERLAYERTITLE {
  label: iLocalString;
}
interface ICONTROLSTITLE {
  label: iLocalString;
  type: 'title';
}
interface ICONTROLSBUTTON {
  label: iLocalString;
  type: 'button';
  icon: string;
  url: string;
  id?: number;
}
interface ICONTROLS {
  [key: string]: (ICONTROLSTITLE | ICONTROLSBUTTON)[];
}
interface IMAP {
  alert_poi_radius?: number;
  alert_poi_show?: boolean;
  bbox: [number, number, number, number];
  center?: [number, number];
  defZoom: number;
  flow_line_quote_orange?: number;
  flow_line_quote_red?: number;
  flow_line_quote_show?: boolean;
  layers?: ILAYER[];
  maxStrokeWidth?: number;
  maxZoom: number;
  minStrokeWidth?: number;
  minZoom: number;
  controls: ICONTROLS;
  pois?: any;
  record_track_show?: boolean;
  ref_on_track_min_zoom?: number;
  ref_on_track_show?: boolean;
  start_end_icons_min_zoom?: number;
  start_end_icons_show?: boolean;
  tiles: {[name: string]: string}[];
  tracks?: any[];
}
interface ILAYER {
  bbox: [number, number, number, number];
  behaviour: {[name: string]: string};
  data_use_bbox: boolean;
  data_use_only_my_data: boolean;
  description: string;
  feature_image: string;
  icon?: any;
  id: string;
  name: string;
  params?: {[id: string]: string};
  style: {[name: string]: string};
  subtitle: string;
  title: string;
  tracks?: {[name: string]: IHIT[]};
}
interface IOVERLAYERS {
  alert?: boolean;
  color?: string;
  createTaxonomy?: ITAXONOMY;
  description?: string;
  fill_color?: string;
  fill_opacity?: number;
  geojsonUrl?: string;
  icon?: string;
  id: string;
  invertPolygons?: boolean;
  line_dash?: number[];
  maxZoom?: number;
  minZoom?: number;
  name?: string;
  noDetails?: boolean;
  noInteraction?: boolean;
  params?: {[id: string]: string};
  preventFilter?: boolean;
  show_label?: boolean;
  stroke_opacity?: number;
  stroke_width?: number;
  tilesUrl: string;
  type: string;
  zindex?: number;
}

type IDETAILSMAPBEHAVIOUR = 'all' | 'track' | 'poi' | 'route';
type ITAXONOMY = 'activity' | 'theme' | 'when' | 'where' | 'who' | 'webmapp_category';

interface IFACEBOOK {
  id: string;
  name: string;
}
interface IGOOGLE {
  id: string;
  iosId: string;
  name: string;
}
interface ICLUSTERING {
  enable: boolean;
  highZoom?: number;
  highZoomRadius: number;
  radius: number;
}
interface IMAPATTRIBUTION {
  label?: string;
  url?: string;
}
interface IAPPDOWNLOADBUTTONS {
  all: boolean;
  poi: boolean;
  route: boolean;
  track: boolean;
}
interface IWEBAPP {
  draw_track_show: boolean;
  editing_inline_show: boolean;
}
interface ICONF {
  APP: IAPP;
  AUTH?: IAUTH;
  HOME?: IHOME[];
  JIDO_UPDATE_TIME?: number;
  LANGUAGES?: ILANGUAGES;
  MAP?: IMAP;
  OPTIONS: IOPTIONS;
  PROJECT?: IPROJECT;
  THEME?: ITHEME;
  WEBAPP?: IWEBAPP;
}

interface IWmImage {
  api_url: string;
  caption: string;
  id: number;
  sizes: {
    '108x148': string;
    '108x137': string;
    '225x100': string;
    '250x150': string;
    '118x138': string;
    '108x139': string;
    '118x117': string;
    '335x250': string;
    '400x200': string;
    '1440x500': string;
  };
  url: string;
}
