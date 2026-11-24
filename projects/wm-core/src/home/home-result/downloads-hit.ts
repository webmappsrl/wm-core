import {Hit} from '@wm-types/elastic';

/**
 * Trasforma le properties di una traccia salvata in un Hit. Le copie salvate in forma v1 non hanno
 * `taxonomyWheres`: lo ricostruisce da `taxonomies.where` (solo elementi con admin_level, dal più
 * generale al più specifico). Un `taxonomyWheres` già presente resta com'è.
 */
export function downloadedPropertiesToHit(properties: any): Hit {
  if (properties?.taxonomyWheres != null) return properties as Hit;
  const where: any[] = Array.isArray(properties?.taxonomies?.where)
    ? properties.taxonomies.where
    : [];
  const taxonomyWheres = where
    .filter(item => item?.admin_level != null)
    .sort((a, b) => a.admin_level - b.admin_level)
    .map(item => item.name);
  return {...properties, taxonomyWheres} as Hit;
}
