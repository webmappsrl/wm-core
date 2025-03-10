import {WmFeature} from '@wm-types/feature';
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

export const calculateLayerPoiCounts = (layers, pois) => {
  const layerCounts: {[key: string]: number} = {};

  if(layers?.length > 0 && pois?.length > 0) {
    layers.forEach(layer => {
      const layerTaxonomies = layer.taxonomy_themes;
      let count = 0;
      pois.forEach(poi => {
          const poiTaxonomies = poi.properties?.taxonomy?.theme ?? [];
          const hasCommonTaxonomy = layerTaxonomies.some(taxonomy =>
              poiTaxonomies.includes(taxonomy?.id)
          );
          if (hasCommonTaxonomy) {
              count++;
          }
      });
      layerCounts[layer.id] = count;
    });
  }

  return layerCounts;
}
