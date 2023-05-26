import {createFeatureSelector, createSelector} from '@ngrx/store';
import {getCSSVariables} from '../../theme/theme';

import {confFeatureKey} from './conf.reducer';

const confFeature = createFeatureSelector<ICONF>(confFeatureKey);
export const MAX_TRACKS = 200;
export const confAPP = createSelector(confFeature, state => state.APP);
export const confGeohubId = createSelector(confAPP, state => state.geohubId);
export const confWEBAPP = createSelector(confFeature, state => state.WEBAPP);
export const confLANGUAGES = createSelector(confFeature, state => state.LANGUAGES);
export const confOPTIONS = createSelector(confFeature, state => state.OPTIONS);
export const confAUTH = createSelector(confFeature, state => state.AUTH);

export const confMAP = createSelector(confFeature, state => state.MAP);
export const confJIDOUPDATETIME = createSelector(confFeature, state => state.JIDO_UPDATE_TIME);

export const confFILTERS = createSelector(confMAP, map => {
  if (map == null || map.filters == null) return undefined;
  let filters = {...map.filters};
  const keys = Object.keys(filters);
  keys.forEach(key => {
    filters[key] = {...filters[key], ...{taxonomy: key}};
  });
  return filters;
});
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

export const confPoisIcons = createSelector(confPOISFilter, taxonomies => {
  const res = {};
  if (taxonomies != null && taxonomies.poi_type != null) {
    const icons = taxonomies.poi_type.filter(p => p.icon != null);
    icons.forEach(icon => {
      res[icon.identifier] = icon.icon;
    });
  }

  return res;
});
export const confTHEME = createSelector(confFeature, state => state.THEME);
export const confPROJECT = createSelector(confFeature, state => state.PROJECT);

export const confTHEMEVariables = createSelector(confTHEME, (theme: ITHEME) =>
  getCSSVariables(theme),
);
export const confShowDrawTrack = createSelector(confWEBAPP, state => state.draw_track_show);
export const confShowEditingInline = createSelector(confWEBAPP, state => state.editing_inline_show);

export const confPreHOME = createSelector(confFeature, state => {
  if (state.HOME != null && state.MAP != null && state.MAP.layers != null) {
    const home: IHOME[] = [];
    state.HOME.forEach(el => {
      if (el.box_type === 'layer') {
        const layers = getLayers([el.layer as unknown as number], state.MAP.layers, []);
        home.push({...el, ...{layer: layers[0]}});
      } else {
        home.push(el);
      }
    });

    return home;
  }

  return state.HOME;
});

export const confHOME = createSelector(confFeature, state => {
  if (state.HOME != null && state.MAP != null && state.MAP.layers != null) {
    const home: IHOME[] = [];
    state.HOME.forEach(el => {
      if (el.box_type === 'layer') {
        const layers = getLayers([el.layer as unknown as number], state.MAP.layers, []);
        home.push({...el, ...{layer: layers[0]}});
      } else {
        home.push(el);
      }
    });

    return home;
  }

  return state.HOME;
});

const getLayers = (layersID: number[], layers: ILAYER[], tracks: IHIT[]): ILAYER[] => {
  return layers
    .filter(l => layersID.indexOf(+l.id) > -1)
    .map(el => {
      if (tracks != null) {
        const tracksObj: {[layerID: number]: IHIT[]} = {};
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
