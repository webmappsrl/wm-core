import { WmFeature } from '@wm-types/feature';
import {Feature, FeatureCollection, Geometry, Point} from 'geojson';
import localforage from 'localforage';

export const filterFeatureCollection = (
  featureCollection: FeatureCollection,
  filters: string[],
  ugcFeatureCollection: WmFeature<Point>[],
  ugcSelected: boolean
): FeatureCollection => {
  if(ugcSelected && ugcFeatureCollection != null){
    return {
      type: 'FeatureCollection',
      features: ugcFeatureCollection
    };
  }
  if (filters == null || filters.length === 0 || featureCollection?.features == null)
    return featureCollection;
  return {
    type: 'FeatureCollection',
    features: featureCollection.features.filter(feature => {
      const taxonomyIdentifiers = feature?.properties?.taxonomyIdentifiers || [];
      return isArrayContained(filters, taxonomyIdentifiers);
    }),
  } as FeatureCollection;
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
export const filterFeatureCollectionByInputTyped = (
  featureCollection: FeatureCollection,
  inputTyped: string,
): FeatureCollection => {
  if (inputTyped == null || inputTyped == '' || featureCollection == null) {
    return featureCollection;
  }
  return {
    type: 'FeatureCollection',
    features: featureCollection.features.filter(feature => {
      const p = feature?.properties;
      const searchable = `${JSON.stringify(p?.name ?? '')}${p?.searchable ?? ''}`;
      return searchable.toLowerCase().indexOf(inputTyped.toLocaleLowerCase()) >= 0;
    }),
  } as FeatureCollection;
};
