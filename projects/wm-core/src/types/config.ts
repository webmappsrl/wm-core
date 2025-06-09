import {Hit} from '@wm-types/elastic';

export type IBASEBOX = IBOX & {
  box_type: 'base';
  items: IHOMEITEMFEATURE[];
  image_url?: string;
};
export type IBOX = {
  box_type:
    | 'title'
    | 'layer'
    | 'track'
    | 'base'
    | 'external_url'
    | 'slug'
    | 'poi_type_filter'
    | 'horizontal_scroll'
    | 'ugc';
  title: iLocalString | string;
};
export type IDETAILSMAPBEHAVIOUR = 'all' | 'track' | 'poi' | 'route';
export type IEXTERNALURLBOX = IHOMEBASEITEM & {
  box_type: 'external_url';
  url: string;
};
export type IHOME =
  | ITITLEBOX
  | ILAYERBOX
  | IBASEBOX
  | IEXTERNALURLBOX
  | ISLUGBOX
  | ITRACKBOX
  | IPOITYPEFILTERBOX
  | IHORIZONTALSCROLLBOX
  | IUGCBOX;
export type IHOMEBASEITEM = {
  title: iLocalString | string;
  image_url: string;
};
export type IHOMEITEM = IHOMEITEMFEATURE | IHOMEITEMURL | IHORIZONTALSCROLLBOXITEM;
export type IHOMEITEMFEATURE = IHOMEBASEITEM & {
  track_id?: number;
  poi_id?: number;
  taxonomy_activities: string[];
  taaxonomy_where: string[];
  distance: string;
  cai_scale: string;
};
export type IHOMEITEMURL = IHOMEBASEITEM & {
  url: string;
};
export type IHORIZONTALSCROLLBOX = IBOX & {
  box_type: 'horizontal_scroll';
  item_type: string;
  items: IHORIZONTALSCROLLBOXITEM[];
  image_url?: string;
};
export type IHORIZONTALSCROLLBOXITEM = IHOMEBASEITEM & {
  res: any;
};
export type ILAYERBOX = IBOX & {
  box_type: 'layer';
  layer: ILAYER;
  icon?: string;
  color?: string;
};
export type IPOITYPEFILTERBOX = {
  box_type: 'poi_type_filter';
} & PoiTypeTaxonomy;
export type ISLUGBOX = IHOMEBASEITEM & {
  box_type: 'slug';
  slug: string;
};
export type ITAXONOMY = 'activity' | 'theme' | 'when' | 'where' | 'who' | 'webmapp_category';
export type ITITLEBOX = IBOX & {
  box_type: 'title';
};
export type ITRACKBOX = IBOX & {
  box_type: 'track';
  track_id: number;
  image_url: string;
};
export type IUGCBOX = IBOX & {
  box_type: 'ugc';
};

export interface Filter {
  identifier: string;
  lower?: number;
  name: iLocalString;
  taxonomy?: string;
  type: 'select' | 'slider';
  upper?: number;
}

export interface IAPP {
  appStoreUrl?: string;
  customerName?: string;
  geohubId?: number;
  googlePlayUrl?: string;
  id?: string;
  sku?: string;
  name: string;
  poi_acquisition_form?: any;
  track_acquisition_form?: any;
  welcome?: string;
}

export interface IAPPDOWNLOADBUTTONS {
  all: boolean;
  poi: boolean;
  route: boolean;
  track: boolean;
}

export interface IAUTH {
  customCreatePostRoles?: boolean;
  enable?: boolean;
  facebook?: IFACEBOOK;
  force?: boolean;
  google?: IGOOGLE;
  hideCountry?: boolean;
  loginToGeohub?: boolean;
  showAtStartup?: boolean;
  skipToDownloadPublicRoute?: boolean;
  webappEnable?: boolean;
}

export interface ICLUSTERING {
  enable: boolean;
  highZoom?: number;
  highZoomRadius: number;
  radius: number;
}

export interface ICONF {
  APP: IAPP;
  AUTH?: IAUTH;
  CREDITS?: IPROJECT;
  DISCLAIMER?: IPROJECT;
  GEOLOCATION?: IGEOLOCATION;
  HOME?: IHOME[];
  JIDO_UPDATE_TIME?: number;
  LANGUAGES?: ILANGUAGES;
  MAP?: IMAP;
  OPTIONS: IOPTIONS;
  PRIVACY?: IPROJECT;
  PROJECT?: IPROJECT;
  THEME?: ITHEME;
  TRANSLATIONS?: {[lang: string]: {[key: string]: string}};
  WEBAPP?: IWEBAPP;
  isMobile: boolean;
  loaded: boolean;
}

export interface ICONTROL {
  label: iLocalString;
  type: string;
}

export interface ICONTROLS {
  [key: string]: (ICONTROLSTITLE | ICONTROLSBUTTON)[];
}

export interface ICONTROLSBUTTON extends ICONTROL {
  default: boolean;
  icon: string;
  id?: number;
  type: 'button';
  url: string;
}

export interface ICONTROLSTITLE extends ICONTROL {
  type: 'title';
}

export interface IConfig {
  APP: IAPP;
  GEOLOCATION?: IGEOLOCATION;
  PROJECT: IPROJECT;
}

export interface IFACEBOOK {
  id: string;
  name: string;
}

export interface IFILTER {
  name: iLocalString;
  type: 'select' | 'slider';
}

export interface IFILTEROPTION {
  color: string;
  icon: string;
  id: number;
  identifier: string;
  name: iLocalString;
}

export interface IFILTERS {
  [key: string]: IFILTERSELECT | IFILTERSLIDER;
}

export interface IFILTERSELECT extends IFILTER {
  options: IFILTEROPTION[];
  type: 'select';
}

export interface IFILTERSLIDER extends IFILTER {
  identifier: string;
  max: number;
  min: number;
  type: 'slider';
}

export interface IGEOLOCATION {
  gps_accuracy_default: number;
  record: {
    enable: boolean;
  };
}

export interface IGOOGLE {
  id: string;
  iosId: string;
  name: string;
}

export interface IHOMEOLD {
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

export interface ILANGUAGES {
  available?: string[];
  default?: string;
}

export interface ILAYER {
  bbox: [number, number, number, number];
  behaviour: {[name: string]: string};
  data_use_bbox: boolean;
  data_use_only_my_data: boolean;
  description: string;
  edges?: {[trackId: number]: {prev: number[]; next: number[]}};
  feature_image: string;
  icon?: any;
  id: string;
  name: string;
  params?: {[id: string]: string};
  style: {[name: string]: string};
  subtitle: string;
  taxonomy_activities?: any[];
  taxonomy_themes?: any[];
  title: string;
  tracks?: {[name: string]: Hit[]};
}

export interface IMAP {
  alert_poi_radius?: number;
  alert_poi_show?: boolean;
  bbox: [number, number, number, number];
  center?: [number, number];
  controls: ICONTROLS;
  defZoom: number;
  edges?: {[trackId: number]: {prev: number[]; next: number[]}};
  filters?: {[key: string]: any};
  flow_line_quote_orange?: number;
  flow_line_quote_red?: number;
  flow_line_quote_show?: boolean;
  hitMapUrl?: string;
  layers?: ILAYER[];
  maxStrokeWidth?: number;
  maxZoom: number;
  minStrokeWidth?: number;
  minZoom: number;
  pois?: any;
  record_track_show?: boolean;
  ref_on_track_min_zoom?: number;
  ref_on_track_show?: boolean;
  start_end_icons_min_zoom?: number;
  start_end_icons_show?: boolean;
  tiles: {[name: string]: string}[];
  tracks?: any[];
}

export interface IMAPATTRIBUTION {
  label?: string;
  url?: string;
}

export interface IOPTIONS {
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
  showAscent: boolean;
  showDescent: boolean;
  showDifficultyLegend: boolean;
  showDistance: boolean;
  showDurationBackward: boolean;
  showDurationForward: boolean;
  showEditLink: boolean;
  showEleFrom: boolean;
  showEleMax: boolean;
  showEleMin: boolean;
  showEleTo: boolean;
  showEmbeddedHtml: boolean;
  showFeaturesInViewport: boolean;
  showGeojsonDownload: boolean;
  showGetDirections?: boolean;
  showGpxDownload: boolean;
  showHelp: boolean;
  showKmlDownload: boolean;
  showMapViewfinder: boolean;
  showMediaName: boolean;
  showPoiListOffline: boolean;
  showShapefileDownload: boolean;
  showTrackRefLabel: boolean;
  showTravelMode?: boolean;
  show_searchbar?: boolean;
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

export interface IOVERLAYERS {
  icon?: string;
  label: iLocalString;
  url: string;
}

export interface IOVERLAYERS {
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

export interface IOVERLAYERTITLE {
  label: iLocalString;
}

export interface IPROJECT {
  HTML: string;
  html: iLocalString;
}

export interface ITHEME {
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

export interface IWEBAPP {
  draw_poi_show: boolean;
  draw_track_show: boolean;
  editing_inline_show: boolean;
  splash_screen_show: boolean;
}

export interface IWmImage {
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

export interface PoiTypeTaxonomy {
  color: string;
  icon: string;
  id: number;
  identifier: string;
  image_url: string;
  name: iLocalString;
}

export interface SelectFilter extends Filter {
  options: SelectFilterOption[];
  type: 'select';
}

export interface SelectFilterOption {
  color?: string;
  icon?: string;
  id?: number;
  identifier: string;
  name: iLocalString;
  taxonomy?: string;
}

export interface SliderFilter extends Filter {
  identifier: string;
  max: number;
  min: number;
  steps: number;
  type: 'slider';
  units: string;
}

export interface iLocalString {
  en?: string;
  it?: string;

  [lang: string]: string;
}
