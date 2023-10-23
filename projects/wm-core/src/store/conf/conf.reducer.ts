import {createReducer, on} from '@ngrx/store';

import {loadConfSuccess} from './conf.actions';
import { ICONF, ICONTROLS, ILAYER } from '../../types/config';
export const confFeatureKey = 'conf';
export interface IConfRootState {
  [confFeatureKey]: ICONF;
}

const initialConfState: ICONF = {
  APP: {
    name: 'Webmapp',
    geohubId: undefined,
  },
  WEBAPP: {
    draw_track_show: false,
    editing_inline_show: false,
  },
  OPTIONS: {
    baseUrl: '-',
    startUrl: '/main/map',
    privacyUrl: 'webmapp.it/privacy',
    passwordRecoveryUrl: '/wp-login.php?action=lostpassword',
    hideGlobalMap: false,
    addArrowsOverTracks: false,
    download_track_enable: true,
    print_track_enable: false,
    showTrackRefLabel: false,
    useCaiScaleStyle: false,
    forceDefaultFeatureColor: false,
    useFeatureClassicSelectionStyle: false,
    downloadRoutesInWebapp: false,
    showPoiListOffline: false,
    showHelp: false,
    hideDisclaimer: false,
    showDifficultyLegend: false,
    showEditLink: false,
    hideSearch: false,
    hideFilters: false,
    resetFiltersAtStartup: false,
    startFiltersDisabled: false,
    showMapViewfinder: false,
    highlightMapButton: false,
    hideNewsletterInSignup: false,
    forceWelcomePagePopup: false,
    skipRouteIndexDownload: false,
    downloadFullGemoetryRouteIndex: false,
    enableTrackAdoption: false,
    highlightReadMoreButton: false,
    trackRefLabelZoom: 12,
    caiScaleStyleZoom: 12,
    poiSelectedRadius: 2.5,
    poiIconZoom: 15,
    poiIconRadius: 1.7,
    poiMaxRadius: 1.7,
    poiMinRadius: 0.2,
    poiMinZoom: 1,
    poiLabelMinZoom: 10,
    minDynamicOverlayLayersZoom: 12,
    clustering: {
      enable: false,
      radius: 70,
      highZoomRadius: 70,
    },
    showAppDownloadButtons: {
      track: false,
      poi: false,
      route: false,
      all: false,
    },
  },
  THEME: {
    primary: '#3880ff',
    secondary: '#0cd1e8',
    tertiary: '#ff0000',
    select: 'rgba(226, 249, 0, 0.6)',
    success: '#10dc60',
    warning: '#ffce00	',
    danger: '#f04141',
    dark: '#000000',
    medium: '#989aa2',
    light: '#ffffff',
    fontXxxlg: '28px',
    fontXxlg: '25px',
    fontXlg: '22px',
    fontLg: '20px',
    fontMd: '17px',
    fontSm: '14px',
    fontXsm: '12px',
    fontFamilyHeader: 'Roboto Slab',
    fontFamilyContent: 'Roboto',
    defaultFeatureColor: '#000000',
    theme: 'webmapp',
  },
};

export const confReducer = createReducer(
  initialConfState,
  on(loadConfSuccess, (state, {conf}) => {
    localStorage.setItem('appname', state.APP.name);
    let MAP = {...state.MAP, ...{...conf.MAP}};
    if (conf.APP.geohubId === 3) {
      let res = {};
      const mockedMapLayers = conf.MAP.layers.map((layer:ILAYER) => {
        const edgesObj = (layer as any).edges;
        const edgesKeys = Object.keys(edgesObj);
        edgesKeys.forEach(edgeKey => {
          let edgeObj = edgesObj[edgeKey];
          const nextCrossroads = isCrossroads(edgesObj, +edgeKey, 'prev');
          const prevCrossroads = isCrossroads(edgesObj, +edgeKey, 'next');
          // @ts-ignore
          res[edgeKey] = {
            ...edgeObj,
            nextCrossroads,
            prevCrossroads,
          };
        });

        return {...layer, ...{edges: res}};
      });

      MAP = {...state.MAP, ...{...conf.MAP, ...{layers: mockedMapLayers}}};
    }
    if (MAP != null) {
      if (MAP.controls) {
        MAP.controls = {...addIdToControls(MAP.controls)};
      }
    }
    return {
      ...conf,
      ...{
        APP: {...state.APP, ...conf.APP},
        WEBAPP: {...state.WEBAPP, ...conf.WEBAPP},
        THEME: {...state.THEME, ...conf.THEME},
        OPTIONS: {...state.OPTIONS, ...conf.OPTIONS},
        MAP,
      },
    };
  }),
);

const addIdToControls = (controls: ICONTROLS): ICONTROLS => {
  const keys = Object.keys(controls);
  let controlsWithIDs = {...controls};
  keys.forEach(key => {
    controlsWithIDs[key] = controlsWithIDs[key].map((c, index) => {
      if (c.type === 'button') {
        return {...c, ...{id: index}};
      }
      return c;
    });
  });
  return controlsWithIDs;
};

const isCrossroads = (
  edges: {[trackID: string]: {prev: number[]; next: number[]}},
  trackID: number,
  trend: 'prev' | 'next' = 'prev',
): boolean => {
  let count = 0;
  const keys = Object.keys(edges).filter(k => +k != trackID);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const edge = edges[key];
    const tracks = [...edge.prev, ...edge.next];
    for (const track of edge[trend]) {
      if (track === trackID) {
        count++;
      }
      if (count > 1) {
        return true;
      }
    }
  }

  return false;
};
