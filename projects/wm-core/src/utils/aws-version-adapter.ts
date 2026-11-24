import {ICONS} from '@wm-types/config';
import {WmFeature} from '@wm-types/feature';
import {AwsVersion, CURRENT_AWS_VERSIONS} from '@wm-types/aws';
import {TaxonomyItem, Taxonomies} from '@wm-types/taxonomy';
import {LineString} from 'geojson';

export interface AdaptedTrack {
  track: WmFeature<LineString>;
  /** icon_name → svg, vuoto se nessun SVG inline */
  icons: ICONS;
}

/**
 * Porta una traccia scaricata da awsApi alla versione corrente (`CURRENT_AWS_VERSIONS.tracks`, oggi v1). Una traccia
 * già nella versione corrente esce com'è; le altre (shard senza
 * versione, GeoHub) ricevono `taxonomies` e perdono le chiavi vecchie. L'input non viene mutato.
 *
 * `where` si costruisce solo dalla mappa `taxonomy_where` degli shard (chiave = identifier, lingue,
 * `_admin_level`), mai dai soli nomi `taxonomyWheres` né dai soli id di `taxonomy.where` di GeoHub.
 */
export function adaptTrackToCurrentVersion(
  track: WmFeature<LineString> | null,
  version: AwsVersion | null | undefined,
): AdaptedTrack | null {
  if (track == null) return null;
  if (version === CURRENT_AWS_VERSIONS.tracks) return {track, icons: {}};

  const properties: any = {...(track.properties ?? {})};
  const oldActivity: any[] = Array.isArray(properties.taxonomy?.activity)
    ? properties.taxonomy.activity
    : [];
  const icons: ICONS = {};
  const items: TaxonomyItem[] = [];

  for (const element of oldActivity) {
    if (element == null || typeof element !== 'object' || element.identifier == null) continue;
    const item: TaxonomyItem = {
      identifier: element.identifier,
      name: copyName(element.name),
    };
    if (element.icon_name !== undefined) item.icon_name = element.icon_name;
    if (typeof element.icon === 'string' && element.icon !== '') {
      const iconName = element.icon_name ?? `txn-${element.identifier}`;
      item.icon_name = iconName;
      icons[iconName] = element.icon;
    }
    items.push(item);
  }

  const taxonomies: Taxonomies = {...(properties.taxonomies ?? {})};
  if (!(taxonomies.activity?.length > 0) && items.length > 0) taxonomies.activity = items;
  const wheres = wheresFromTaxonomyWhere(properties.taxonomy_where);
  if (!(taxonomies.where?.length > 0) && wheres.length > 0) taxonomies.where = wheres;

  properties.taxonomies = taxonomies;
  delete properties.taxonomy;
  delete properties.taxonomy_where;
  delete properties.taxonomyWheres;

  return {track: {...track, properties}, icons};
}

function copyName(name: any): TaxonomyItem['name'] {
  const result: any = {};
  for (const [language, value] of Object.entries(name ?? {})) {
    if (value != null) result[language] = value;
  }
  return result;
}

/**
 * Converte la mappa `taxonomy_where` degli shard senza versione, per esempio
 * `{"R43003": {"it": "Lama Mocogno", "_admin_level": 8}}`, negli elementi v1 di `taxonomies.where`.
 * Le chiavi che iniziano con `_` (`_admin_level`, `_source`) non sono lingue. GeoHub manda `null`.
 */
function wheresFromTaxonomyWhere(taxonomyWhere: any): TaxonomyItem[] {
  if (taxonomyWhere == null || typeof taxonomyWhere !== 'object' || Array.isArray(taxonomyWhere)) {
    return [];
  }
  const wheres: TaxonomyItem[] = [];
  for (const [identifier, value] of Object.entries<any>(taxonomyWhere)) {
    if (value == null || typeof value !== 'object') continue;
    const languages: any = {};
    for (const [key, label] of Object.entries(value)) {
      if (!key.startsWith('_')) languages[key] = label;
    }
    const item: TaxonomyItem = {identifier, name: copyName(languages)};
    if (typeof value._admin_level === 'number') item.admin_level = value._admin_level;
    wheres.push(item);
  }
  return wheres;
}
