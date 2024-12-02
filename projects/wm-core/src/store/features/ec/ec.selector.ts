import {createFeatureSelector, createSelector} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
import {confFILTERSTRACKS, confPOISFilter, confPoisIcons} from '../../conf/conf.selector';
import {buildStats, filterFeatures, filterFeaturesByInputTyped} from './utils';
import {IELASTIC, IHIT} from '../../../types/elastic';
import {Ec} from './ec.reducer';
import {ugcOpened, inputTyped} from '@wm-core/store/user-activity/user-activity.selector';

export const ec = createFeatureSelector<IELASTIC>('ec');

export const queryEc = createSelector(ec, (state: Ec) => state.hits ?? []);
export const countEcTracks = createSelector(ec, (state: Ec) => state.hits.length ?? undefined);
// @ts-ignore
export const statsApi = createSelector(ec, (state: SearchResponse<IHIT>) => {
  if (state != null && state.aggregations) {
    let res = [];
    const countKeys = Object.keys(state.aggregations).filter(k => k.indexOf('_count') < 0);
    countKeys.forEach(countKey => {
      res = [
        // @ts-ignore
        ...res,
        // @ts-ignore
        ...state.aggregations[countKey].count.buckets,
        // @ts-ignore
        ...[
          {
            key: countKey,
            doc_count: state.aggregations.themes.doc_count,
          },
        ],
      ];
    });
    return res;
  }
});

export const apiElasticState = createSelector(ec, state => {
  return {
    layer: state.layer,
    filterTracks: state.filterTracks,
    lastFilterType: 'tracks',
  };
});

export const apiFilterTracks = createSelector(apiElasticState, state => {
  return state.filterTracks;
});
export const apiTrackFilterIdentifier = createSelector(apiFilterTracks, filterTracks => {
  return filterTracks.map((f: any) => f.identifier);
});
export const ecLayer = createSelector(apiElasticState, state => {
  return state.layer;
});
export const ecElasticStateLoading = createSelector(ec, state => {
  return state.loading;
});
export const apiGoToHome = createSelector(ec, state => {
  return state.goToHome;
});
export const confFILTERSTRACKSOPTIONS = createSelector(
  confFILTERSTRACKS,
  filterTrack => filterTrack.options ?? [],
);

export const showPoisResult = createSelector(ec, state => state.where != null);
export const showResult = createSelector(
  ec,
  ugcOpened,
  inputTyped,
  (state, ugcOpened, inputTyped) => {
    return (
      state.layer != null ||
      state.filterTracks.length > 0 ||
      (state.poisSelectedFilterIdentifiers && state.poisSelectedFilterIdentifiers.length > 0) ||
      (inputTyped != null && inputTyped != '') ||
      ugcOpened
    );
  },
);
export const lastFilterType = createSelector(ec, state => {
  return state.lastFilterType;
});
export const poiFilterIdentifiers = createSelector(
  ec,
  state => state.poisSelectedFilterIdentifiers ?? [],
);
export const poiFilters = createSelector(ec, confPOISFilter, (state, poisFilters) => {
  let filters: any = [];

  if (state.poisSelectedFilterIdentifiers != null && poisFilters.poi_type != null) {
    // @ts-ignore
    filters = [
      // @ts-ignore
      ...filters,
      // @ts-ignore
      ...poisFilters.poi_type.filter(
        // @ts-ignore
        poiFilter => state.poisSelectedFilterIdentifiers.indexOf(poiFilter.identifier) >= 0,
      ),
    ];
  }
  // @ts-ignore
  return filters;
});
export const countSelectedFilters = createSelector(
  poiFilters,
  apiFilterTracks,
  (pFilters, tFilters) => pFilters.length + tFilters.length ?? 0,
);

export const filterTaxonomies = createSelector(ec, state => state.filterTaxonomies);

export const allEcPois = createSelector(ec, state => state.ecPois);
export const allEcpoiFeatures = createSelector(ec, state => state.ecPoiFeatures);
export const poisInitCount = createSelector(allEcpoiFeatures, allEcPois => allEcPois?.length ?? 0);

export const poisWhereFeatures = createSelector(
  allEcpoiFeatures,
  filterTaxonomies,
  (allEcPois, filter) => filterFeatures(allEcPois, filter),
);
export const poisFilteredFeatures = createSelector(
  poisWhereFeatures,
  poiFilterIdentifiers,
  (poisWhereFeatures, filter) => filterFeatures(poisWhereFeatures, filter),
);
export const poisFilteredFeaturesByInputType = createSelector(
  poisFilteredFeatures,
  inputTyped,
  (poisFilteredFeatures, inputTyped) =>
    filterFeaturesByInputTyped(poisFilteredFeatures, inputTyped),
);
export const ecPois = createSelector(
  poisFilteredFeaturesByInputType,
  confPoisIcons,
  (allEcPois, icons) => {
    let allEcPoisfeatures = allEcPois;
    if (allEcPoisfeatures != null && icons != null) {
      const iconKeys = Object.keys(icons);
      const features = allEcPoisfeatures.map((f: any) => {
        if (f != null && f.properties != null && f.properties.taxonomyIdentifiers != null) {
          const filteredArray = f.properties.taxonomyIdentifiers.filter((value: any) =>
            iconKeys.includes(value),
          );
          if (filteredArray.length > 0) {
            //@ts-ignore
            let p = {...f.properties, ...{svgIcon: icons[filteredArray[0]]}};

            return {...f, ...{properties: p}};
          }
        }
        return f;
      });
      return features;
    }
    return allEcPoisfeatures;
  },
);
export const countEcPois = createSelector(ecPois, ecPois => ecPois?.length);
export const countEcAll = createSelector(countEcTracks, countEcPois, (cTracks, cPois) => {
  const c1 = typeof cTracks === 'number' ? cTracks : 0;
  const c2 = typeof cPois === 'number' ? cPois : 0;
  return c1 + c2;
});
export const poisInitStats = createSelector(allEcPois, allEcPois => buildStats(allEcPois));
export const trackStats = createSelector(statsApi, _statsApi => {
  const stats: {[identifier: string]: any} = {};
  if (_statsApi) {
    _statsApi.forEach(element => {
      stats[element.key] = element.doc_count;
    });
  }
  return stats;
});
export const poisWhereStats = createSelector(poisWhereFeatures, poisWhereFeatures =>
  buildStats(poisWhereFeatures),
);
export const poisFiltersStats = createSelector(poisFilteredFeatures, poisFilteredFeatures =>
  buildStats(poisFilteredFeatures),
);
export const poisFilteredFeaturesByInputTypeStats = createSelector(
  poisFilteredFeaturesByInputType,
  poisFilteredFeaturesByInputType => buildStats(poisFilteredFeaturesByInputType),
);
export const poisStats = createSelector(
  poisFilteredFeaturesByInputTypeStats,
  poisFilteredFeaturesByInputTypeStats => poisFilteredFeaturesByInputTypeStats,
);
export const hasActiveFilters = createSelector(
  apiFilterTracks,
  poiFilters,
  showPoisResult,
  (apiFilterTracks, poiFilters, showPoisResult) => {
    return apiFilterTracks.length > 0 || poiFilters.length > 0 || showPoisResult;
  },
);
