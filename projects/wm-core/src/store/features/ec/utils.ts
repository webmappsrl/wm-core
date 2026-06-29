import {ILAYER} from '@wm-core/types/config';
import {Bucket} from '@wm-types/elastic';
import {LayerFeaturesCount, WmFeature} from '@wm-types/feature';
import {Feature, Geometry, LineString, Point} from 'geojson';

export const filterFeatures = (
  features: WmFeature<Point | LineString>[],
  filters: string[],
): WmFeature<Point | LineString>[] => {
  if (filters == null || filters.length === 0 || features == null) {
    return features;
  }
  try {
    const filteredFeatures = features.filter(feature => {
      const taxonomyIdentifiers = feature?.properties?.taxonomyIdentifiers || [];
      return isArrayContained(filters, taxonomyIdentifiers);
    });
    return filteredFeatures;
  } catch (e) {
    return features;
  }
};
export const isArrayContained = (needle: any[], haystack: any[]): boolean => {
  if (needle.length > haystack.length) return false;
  return needle.every(element => haystack.includes(element));
};
export const buildStats = (
  features: Feature<
    Geometry,
    {
      [name: string]: {[identifier: string]: any};
    }
  >[],
) => {
  if (features == null) return {};
  const stats: {[identifier: string]: any} = {};
  features.forEach(feature => {
    // @ts-ignore
    const taxonomyIdentifiers = feature?.properties?.taxonomyIdentifiers || [];
    taxonomyIdentifiers.forEach((taxonomyIdentifier: any) => {
      // @ts-ignore
      stats[taxonomyIdentifier] =
        stats[taxonomyIdentifier] != null ? stats[taxonomyIdentifier] + 1 : 1;
    });
  });
  return stats;
};
export const filterFeaturesByInputTyped = (
  features: WmFeature<Point | LineString>[],
  inputTyped: string,
): WmFeature<Point | LineString>[] => {
  if (inputTyped == null || inputTyped == '' || features == null) {
    return features;
  }
  const filteredFeaturesByInputTyped = features.filter(feature => {
    const p = feature?.properties;
    const searchable = `${JSON.stringify(p?.name ?? '')}${p?.searchable ?? ''}`;
    return searchable.toLowerCase().indexOf(inputTyped.toLocaleLowerCase()) >= 0;
  });
  return filteredFeaturesByInputTyped;
};

export const hasLayerIdData = (features: WmFeature<Point | LineString>[]): boolean => {
  if (!features?.length) return false;
  return features.some(
    f => Array.isArray(f?.properties?.layers) && f.properties.layers.length > 0,
  );
};

export const filterFeaturesByLayerId = (
  features: WmFeature<Point | LineString>[],
  layerId: number,
): WmFeature<Point | LineString>[] => {
  if (isNaN(layerId)) {
    console.warn('[filterFeaturesByLayerId] layerId is NaN — skipping layer ID filter');
    return features;
  }
  return features.filter(f => {
    const layers: number[] = f?.properties?.layers ?? [];
    return layers.includes(layerId);
  });
};

export const calculateLayerFeaturesCount = (
  layers: ILAYER[],
  pois: WmFeature<Point>[],
  aggregationBucketsLayers: Bucket[],
) => {
  const layerFeaturesCount: LayerFeaturesCount = {};
  const useLayerIds = hasLayerIdData(pois);

  if (layers?.length > 0 && (pois?.length > 0 || aggregationBucketsLayers?.length > 0)) {
    layers.forEach(layer => {
      const layerId = layer.id;
      layerFeaturesCount[layerId] = {pois: 0, tracks: 0};

      let poisForLayer: WmFeature<Point>[];

      const layerTaxonomies = layer.taxonomy_themes;
      const taxonomyFilter = (p: WmFeature<Point>) => {
        const poiTaxonomies = p.properties?.taxonomy?.theme ?? [];
        return layerTaxonomies?.some(taxonomy => poiTaxonomies.includes(taxonomy?.id)) ?? false;
      };

      if (useLayerIds) {
        const numericId = +layerId;
        if (!layerId || isNaN(numericId)) {
          console.warn(`[calculateLayerFeaturesCount] layer.id "${layerId}" is not numeric — falling back to taxonomy`);
          poisForLayer = pois.filter(taxonomyFilter);
        } else {
          poisForLayer = pois.filter(poi => {
            const poiLayers: number[] = poi.properties?.layers ?? [];
            return poiLayers.includes(numericId);
          });
        }
      } else {
        poisForLayer = pois.filter(taxonomyFilter);
      }

      layerFeaturesCount[layerId].pois = poisForLayer.length;

      const layerBucket = aggregationBucketsLayers.find(bucket => bucket.key == layerId);
      if (layerBucket) {
        layerFeaturesCount[layerId].tracks = layerBucket.doc_count;
      }
    });
  }

  return layerFeaturesCount;
};
