import {createFeatureSelector, createSelector} from '@ngrx/store';
import {confFILTERSTRACKS, confMAPLayers, confPOISFilter} from '../../conf/conf.selector';
import {
  buildStats,
  calculateLayerFeaturesCount,
  filterFeatures,
  filterFeaturesByInputTyped,
  filterFeaturesByLayerId,
  hasLayerIdData,
} from './utils';
import {Elastic} from '@wm-types/elastic';
import {Ec} from './ec.reducer';
import {
  inputTyped,
  filterTracks,
  filterTaxonomies,
  poiFilterIdentifiers,
  poisSelectedFilterIdentifiers,
  currentEcLayer,
} from '@wm-core/store/user-activity/user-activity.selector';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {icons} from '@wm-core/store/icons/icons.selector';

export const ec = createFeatureSelector<Elastic>('ec');

export const ecTracks = createSelector(ec, (state: Ec) => state.hits ?? []);
export const countEcTracks = createSelector(ec, (state: Ec) => state.hits.length ?? undefined);
export const aggregations = createSelector(ec, (state: Ec) => state.aggregations ?? undefined);
export const initialAggregations = createSelector(ec, (state: Ec) => state.initialAggregations ?? undefined);
// @ts-ignore
export const statsApi = createSelector(aggregations, aggregations => {
  if (aggregations) {
    let res = [];
    const countKeys = Object.keys(aggregations).filter(k => k.indexOf('_count') < 0);
    countKeys.forEach(countKey => {
      res = [
        // @ts-ignore
        ...res,
        // @ts-ignore
        ...aggregations[countKey].count.buckets,
        // @ts-ignore
        ...[
          {
            key: countKey,
            doc_count: aggregations?.themes?.doc_count,
          },
        ],
      ];
    });
    return res;
  }
});
export const aggregationBucketsLayers = createSelector(aggregations, aggregations => {
  return aggregations?.layers?.count?.buckets ?? [];
});
export const ecTracksLoading = createSelector(ec, state => {
  return state.ecTracksLoading;
});
export const confFILTERSTRACKSOPTIONS = createSelector(
  confFILTERSTRACKS,
  filterTrack => filterTrack.options ?? [],
);

export const showPoisResult = createSelector(ec, state => state.where != null);

export const poiFilters = createSelector(
  poisSelectedFilterIdentifiers,
  confPOISFilter,
  (poisSelectedFilterIdentifiers, poisFilters) => {
    let filters: any = [];

    if (poisSelectedFilterIdentifiers != null && poisFilters?.poi_type != null) {
      // @ts-ignore
      filters = [
        // @ts-ignore
        ...filters,
        // @ts-ignore
        ...poisFilters.poi_type.filter(
          // @ts-ignore
          poiFilter => poisSelectedFilterIdentifiers.indexOf(poiFilter.identifier) >= 0,
        ),
      ];
    }
    // @ts-ignore
    return filters;
  },
);
export const countSelectedFilters = createSelector(
  poiFilters,
  filterTracks,
  (pFilters, tFilters) => {
    return (pFilters?.length ?? 0) + (tFilters?.length ?? 0);
  },
);

export const allEcPois = createSelector(ec, state => state.ecPois);
export const allEcpoiFeatures = createSelector(ec, state => state.ecPoiFeatures);
export const poisInitCount = createSelector(allEcpoiFeatures, allEcPois => allEcPois?.length ?? 0);

export const poisWhereFeatures = createSelector(
  allEcpoiFeatures,
  filterTaxonomies,
  currentEcLayer,
  (allEcPois, filter, layer) => {
    const taxonomyFiltered = filterFeatures(allEcPois, filter);
    if (layer == null) return taxonomyFiltered;
    if (!hasLayerIdData(allEcPois)) return taxonomyFiltered;
    const layerId = +layer.id;
    if (!layer.id || isNaN(layerId)) {
      console.warn(`[poisWhereFeatures] layer.id "${layer.id}" is not numeric — skipping layer ID filter`);
      return taxonomyFiltered;
    }
    return filterFeaturesByLayerId(taxonomyFiltered, layerId);
  },
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
export const ecPois = createSelector(poisFilteredFeaturesByInputType, icons, (allEcPois, icons) => {
  let allEcPoisfeatures = allEcPois;
  if (allEcPoisfeatures != null && icons != null) {
    const features = allEcPoisfeatures.map((f: any) => {
      if (f?.properties?.taxonomy?.poi_type != null) {
        const iconName = f.properties.taxonomy.poi_type.icon_name ?? '';
        const svgIcon = icons?.[iconName] ?? f.properties.taxonomy.poi_type.icon ?? ''; // TODO: [icon_name] da rimuovere una volta rigenerate tutte le tracce
        let p = {...f.properties, ...{svgIcon}};
        return {...f, ...{properties: p}};
      }
      return f;
    });
    return features;
  }
  return allEcPoisfeatures;
});
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
  filterTracks,
  poiFilters,
  showPoisResult,
  (filterTracks, poiFilters, showPoisResult) => {
    return filterTracks.length > 0 || poiFilters.length > 0 || showPoisResult;
  },
);

export const currentEcTrack = createSelector(ec, state => state.currentEcTrack);
export const currentEcTrackProperties = createSelector(
  currentEcTrack,
  currentEcTrack => currentEcTrack?.properties ?? null,
);
export const currentEcRelatedPoiId = createSelector(ec, state => state.currentEcRelatedPoiId);
export const currentEcRelatedPois = createSelector(currentEcTrackProperties, properties => {
  const res = (properties?.related_pois as WmFeature<Point>[]) ?? null;
  return res;
});
export const currentEcRelatedPoi = createSelector(
  currentEcRelatedPois,
  currentEcRelatedPoiId,
  (relatedPois, relatedPoiId) => {
    if (relatedPois != null) {
      return relatedPois.find((p: WmFeature<Point>) => +p?.properties?.id === +relatedPoiId);
    }
    return null;
  },
);
export const currentEcPoiId = createSelector(ec, state => state.currentEcPoiId ?? null);
export const currentEcPoi = createSelector(
  currentEcPoiId,
  ecPois,
  (ecPoiId, ecPois) => ecPois.find(p => p.properties.id == ecPoiId) ?? null,
);

export const currentEcPoiProperties = createSelector(currentEcPoi, currentEcPoi => {
  const res = currentEcPoi?.properties ?? null;
  return res;
});
export const currentEcRelatedPoiProperties = createSelector(
  currentEcRelatedPoi,
  currentEcRelatedPoiProperties => {
    const res = currentEcRelatedPoiProperties?.properties ?? null;
    return res;
  },
);
export const currentPoiProperties = createSelector(
  currentEcPoiProperties,
  currentEcRelatedPoiProperties,
  (currentEcPoiProperties, currentEcRelatedPoiProperties) => {
    if (JSON.stringify(currentEcPoiProperties) === JSON.stringify({related: false})) {
      currentEcPoiProperties = null;
    }
    return currentEcPoiProperties ?? currentEcRelatedPoiProperties ?? null;
  },
);

export const layerFeaturesCount = createSelector(
  confMAPLayers,
  allEcpoiFeatures,
  aggregationBucketsLayers,
  (confMAPLayers, allEcpoiFeatures, aggregationBucketsLayers) => {
    return calculateLayerFeaturesCount(confMAPLayers, allEcpoiFeatures, aggregationBucketsLayers);
  },
);

export const initialAggregationBucketsLayers = createSelector(initialAggregations, agg => agg?.layers?.count?.buckets ?? []);
export const layerFeaturesTotalCount = createSelector(
  confMAPLayers,
  allEcpoiFeatures,
  initialAggregationBucketsLayers,
  (layers, pois, buckets) => calculateLayerFeaturesCount(layers, pois, buckets),
);

export const currentRelatedPoiIndex = createSelector(
  currentEcRelatedPois,
  currentEcRelatedPoiId,
  (relatedPois, relatedPoiId) => {
    if (relatedPois != null) {
      return relatedPois.findIndex((p: WmFeature<Point>) => +p?.properties?.id === +relatedPoiId);
    }
    return null;
  },
);

export const currentRelatedPoisCount = createSelector(
  currentEcRelatedPois,
  currentEcRelatedPois => {
    return currentEcRelatedPois?.length ?? 0;
  },
);

/**
 * `true` quando il dettaglio aperto è davvero un POI correlato, e non un POI scelto direttamente.
 *
 * `currentPoiProperties` restituisce **lo stesso oggetto** di uno dei due selettori a monte, e
 * preferisce quello del POI diretto: il confronto per riferimento dice quindi quale dei due si sta
 * mostrando, senza rifare la logica del sentinella `{related: false}`.
 *
 * Serve perché `ec_related_poi` resta nell'URL anche dopo aver scelto un altro POI dalla mappa:
 * `setPoi` aggiunge `poi` e azzera `ugc_poi`, non quello. Senza questa condizione il navigatore
 * resterebbe acceso su un POI che non c'entra, con un contatore che conta un altro elenco.
 */
export const isShowingRelatedPoi = createSelector(
  currentPoiProperties,
  currentEcRelatedPoiProperties,
  (current, related) => current != null && related != null && current === related,
);

/**
 * L'unica condizione per cui la navigazione fra POI correlati ha senso: si sta mostrando un
 * correlato e ce n'è più di uno. La usano **entrambi** i punti che navigano — i pulsanti del
 * navigatore e le scorciatoie da tastiera del popup della webapp — perché due gate scritti
 * separatamente divergono, ed è esattamente quello che era successo.
 */
export const canNavigateRelatedPois = createSelector(
  isShowingRelatedPoi,
  currentRelatedPoisCount,
  (isRelated, count) => isRelated && count > 1,
);

export const nextRelatedPoiId = createSelector(
  currentEcRelatedPois,
  currentEcRelatedPoiId,
  (relatedPois, relatedPoiId) => {
    // `currentEcRelatedPois` restituisce `?? null` quando non c'è un track corrente con
    // related_pois: senza la prima guardia `findIndex` lancia.
    //
    // La seconda guardia copre il caso in cui nessun POI correlato è selezionato: lì `findIndex`
    // torna `-1`, e `relatedPois[-1 + 1]` sarebbe il **primo** correlato del track, cioè una
    // navigazione verso un POI che non c'entra con quello aperto. Il navigator non lo mostrava
    // perché il suo template ha un gate in più — `currentRelatedPoiIndex` filtra i null e somma 1,
    // quindi con `-1` emette `0`, falsy — ma le scorciatoie da tastiera del popup della webapp no.
    if (relatedPois == null) {
      return null;
    }
    const index = relatedPois.findIndex(
      (p: WmFeature<Point>) => +p?.properties?.id === +relatedPoiId,
    );
    if (index < 0) {
      return null;
    }
    return relatedPois[index + 1]?.properties?.id ?? null;
  },
);

export const prevRelatedPoiId = createSelector(
  currentEcRelatedPois,
  currentEcRelatedPoiId,
  (relatedPois, relatedPoiId) => {
    // Vedi `nextRelatedPoiId`: stesse due guardie, stesso motivo.
    if (relatedPois == null) {
      return null;
    }
    const index = relatedPois.findIndex(
      (p: WmFeature<Point>) => +p?.properties?.id === +relatedPoiId,
    );
    if (index < 0) {
      return null;
    }
    return relatedPois[index - 1]?.properties?.id ?? null;
  },
);

export const currentEcImageGalleryIndex = createSelector(
  ec,
  (state: Ec) => state.currentEcImageGalleryIndex,
);

export const currentEcImageGallery = createSelector(
  currentEcRelatedPoiProperties,
  currentEcTrackProperties,
  currentEcPoiProperties,
  (currentEcRelatedPoiProperties, currentEcTrackProperties, currentEcPoiProperties) => {
    return (
      currentEcRelatedPoiProperties?.image_gallery ??
      currentEcTrackProperties?.image_gallery ??
      currentEcPoiProperties?.image_gallery ??
      null
    );
  },
);
