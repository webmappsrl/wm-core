import {createFeatureSelector, createSelector} from '@ngrx/store';
import {getCSSVariables} from '../../theme/theme';

import {confFeatureKey} from './conf.reducer';
import {Hit} from '@wm-types/elastic';
import {ICONF, IHOME, ILAYER, ITHEME} from '../../types/config';

const confFeature = createFeatureSelector<ICONF>(confFeatureKey);
export const MAX_TRACKS = 200;
export const isConfLoaded = createSelector(confFeature, state => !!state && state.loaded);

export const confAPP = createSelector(confFeature, state => state.APP);
export const confWEBAPP = createSelector(confFeature, state => state.WEBAPP);
export const confGeohubId = createSelector(confAPP, state => state.geohubId);
export const confPOIFORMS = createSelector(confAPP, app => app.poi_acquisition_form);
export const confTRACKFORMS = createSelector(confAPP, app => app.track_acquisition_form);
export const confLANGUAGES = createSelector(confFeature, state => state.LANGUAGES);
export const confOPTIONS = createSelector(confFeature, state => state.OPTIONS);
export const confAUTH = createSelector(confFeature, state => state.AUTH);
export const confAUTHMobileEnable = createSelector(confAUTH, auth => auth?.enable ?? false);
export const confAUTHWebappEnable = createSelector(confAUTH, auth => auth?.webappEnable ?? false);
export const confIsMobile = createSelector(confFeature, state => state.isMobile);
export const confAUTHEnable = createSelector(
  confIsMobile,
  confAUTHMobileEnable,
  confAUTHWebappEnable,
  (isMobile, mobileEnable, webappEnable) => {
    return isMobile ? mobileEnable : webappEnable;
  },
);
export const confMAP = createSelector(confFeature, state => state.MAP);
export const confMAPHitMapUrl = createSelector(confMAP, state => state?.hitMapUrl ?? null);
export const confMAPLayers = createSelector(confMAP, state => state.layers);
export const flowLineQuoteShow = createSelector(confMAP, state => state.flow_line_quote_show);
export const confFlowLineQuote = createSelector(confMAP, state =>
  state.flow_line_quote_show
    ? {
        flow_line_quote_orange: state.flow_line_quote_orange,
        flow_line_quote_red: state.flow_line_quote_red,
      }
    : null,
);
export const confJIDOUPDATETIME = createSelector(confFeature, state => state.JIDO_UPDATE_TIME);
export const confTRANSLATIONS = createSelector(confFeature, state => state.TRANSLATIONS);
export const confRecordTrackShow = createSelector(
  confMAP,
  state => state?.record_track_show ?? false,
);
export const confFILTERS = createSelector(confMAP, map => {
  if (map == null || map.filters == null) return undefined;
  let filters = {...map.filters};
  const keys = Object.keys(filters);
  keys.forEach(key => {
    filters[key] = {...filters[key], ...{taxonomy: key}};
  });
  if (filters['poi_type']) {
    delete filters['poi_type'];
  }
  return filters;
});
export const confFILTERSTRACKS = createSelector(confFILTERS, filters => filters?.activities ?? []);
export const confMAPLAYERS = createSelector(confMAP, map => map.layers ?? undefined);
export const confPOISFilter = createSelector(confMAP, map => {
  if (map != null && map.pois != null && map.pois.taxonomies != null) {
    let res: any = {};
    const where = map.pois.taxonomies.where;
    if (where) {
      res.where = where;
    }
    const poi_type = map.pois.taxonomies.poi_type;
    if (poi_type) {
      res.poi_type = poi_type;
    }

    return res;
  }
  return undefined;
});

export const confTHEME = createSelector(confFeature, state => state.THEME);
export const confPROJECT = createSelector(confFeature, state => state.PROJECT);
export const confCREDITS = createSelector(confFeature, state => state.CREDITS);
export const confPRIVACY = createSelector(confFeature, state => state.PRIVACY);
export const confPAGES = createSelector(confFeature, state => ({
  PROJECT: state.PROJECT,
  CREDITS: state.CREDITS,
  DISCLAIMER: state.DISCLAIMER,
  PRIVACY: state.PRIVACY,
}));
export const confDISCLAIMER = createSelector(confFeature, state => state.DISCLAIMER);
export const confGEOLOCATION = createSelector(confFeature, state => state.GEOLOCATION);

export const confTHEMEVariables = createSelector(confTHEME, (theme: ITHEME) =>
  getCSSVariables(theme),
);
export const confShowDrawTrack = createSelector(confWEBAPP, state => state.draw_track_show);
export const confShowDrawPoi = createSelector(confWEBAPP, state => state.draw_poi_show);
export const confShowDraw = createSelector(
  confShowDrawPoi,
  confShowDrawTrack,
  (drawPoi, drawTrack) => {
    return drawPoi || drawTrack;
  },
);
export const confShowEditingInline = createSelector(confWEBAPP, state => state.editing_inline_show);
export const confPOIS = createSelector(confMAP, map => {
  if (map != null && map.pois != null) {
    return map.pois;
  }
  return undefined;
});
export const confHOME = createSelector(confFeature, confFILTERS, (state, filters) => {
  if (state.HOME != null && state.MAP != null) {
    const home: IHOME[] = [];
    state.HOME.forEach((el: IHOME) => {
      if (el.box_type === 'layer') {
        if (state.MAP.layers != null) {
          const layers = getLayers([el.layer as unknown as number], state.MAP.layers, []);
          home.push({...el, ...{layer: layers[0]}});
        }
      } else if (el.box_type === 'horizontal_scroll') {
        if (filters[el.item_type] != null) {
          const horizontalScrollFiltersOpt = filters[el.item_type].options;
          const enrichItems = el.items.map((i: any) => {
            const enrichItem =
              horizontalScrollFiltersOpt.filter((opt: any) => i.title === opt.identifier)[0] ?? {};
            return {...i, ...enrichItem};
          });
          home.push({...el, ...{items: enrichItems}});
        }
      } else {
        home.push(el);
      }
    });
    return home;
  }

  return state.HOME;
});
export const confOPTIONSShowFeaturesInViewport = createSelector(
  confOPTIONS,
  state => state.showFeaturesInViewport,
);
export const confOPTIONSShowMediaName = createSelector(confOPTIONS, state => state.showMediaName);
export const confOPTIONSShowEmbeddedHtml = createSelector(
  confOPTIONS,
  state => state.showEmbeddedHtml,
);
export const confOPTIONSShowDownloadTilesButton = createSelector(
  confOPTIONS,
  state => state.showDownloadTilesButton,
);

export const confZoomFeaturesInViewport = createSelector(confOPTIONS, state => {
  const minZoomFeaturesInViewport = state.minZoomFeaturesInViewport;
  const maxZoomFeaturesInViewport = state.maxZoomFeaturesInViewport;
  return {
    minZoomFeaturesInViewport,
    maxZoomFeaturesInViewport,
  };
});

export const confReleaseUpdate = createSelector(confAPP, app => ({
  forceToReleaseUpdate: app?.forceToReleaseUpdate ?? false,
  androidStore: app?.androidStore ?? null,
  iosStore: app?.iosStore ?? null,
  sku: app?.sku ?? null,
}));

const getLayers = (layersID: number[], layers: ILAYER[], tracks: Hit[]): ILAYER[] => {
  return layers
    .filter(l => layersID.indexOf(+l.id) > -1)
    .map(el => {
      if (tracks != null) {
        const tracksObj: {[layerID: number]: Hit[]} = {};
        tracks.forEach(track => {
          track.layers.forEach(l => {
            if (layersID.indexOf(l) > -1) {
              tracksObj[l] = tracksObj[l] != null ? [...tracksObj[l], track] : [track];
            }
          });
        });
        return {...el, ...{tracks: tracksObj}};
      }
      return el;
    });
};
