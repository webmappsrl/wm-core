// Oggetto `import` scritto nelle properties di una UGC importata da file (oc:8764): descrive il
// file da cui viene, e la sua sola presenza dice che la UGC non è stata registrata né creata
// nell'app.
import * as toGeoJSON from '@tmcw/togeojson';
import {LineString, Point} from 'geojson';
import {WmFeature} from '@wm-types/feature';

/** Informazioni sul file da cui è stata importata una UGC. */
export interface UgcImportInfo {
  format: 'gpx' | 'kml' | 'geojson';
  file_name: string;
  /** Dimensione del file in byte. */
  file_size: number;
  /** Data di modifica del file, ISO 8601; manca se il dispositivo non la fornisce valida. */
  file_last_modified?: string;
  /** Attributo `creator` di `<gpx>`: solo per i GPX che lo dichiarano. */
  creator?: string;
  /** Punti della UGC salvata: l'uploader tiene solo la prima linea, o il primo punto, del file. */
  points: number;
  /** Geometrie contenute nel file. */
  file_features: number;
  has_time: boolean;
  /** Solo per le tracce: la geometria dei POI è sempre 2D. */
  has_elevation?: boolean;
}

/**
 * Calcola l'oggetto `import` di una UGC appena convertita dall'uploader.
 *
 * @param file Il file scelto dall'utente.
 * @param content Il testo del file.
 * @param feature La feature convertita che l'uploader salverà.
 * @returns Le informazioni sul file importato.
 */
export function buildUgcImportInfo(
  file: File,
  content: string,
  feature: WmFeature<LineString | Point>,
): UgcImportInfo {
  const format = file.name.split('.').pop()?.toLowerCase() as UgcImportInfo['format'];
  const doc = format === 'geojson' ? null : new DOMParser().parseFromString(content, 'text/xml');
  const creator = format === 'gpx' ? doc?.documentElement?.getAttribute('creator') : null;
  const isLine = feature.geometry.type === 'LineString';

  return {
    format,
    file_name: file.name,
    file_size: file.size,
    ...(Number.isFinite(file.lastModified)
      ? {file_last_modified: new Date(file.lastModified).toISOString()}
      : {}),
    ...(creator ? {creator} : {}),
    points: isLine ? (feature.geometry as LineString).coordinates.length : 1,
    file_features: countFileFeatures(format, doc),
    has_time: isLine ? lineHasTime(feature) : pointHasTime(feature),
    ...(isLine ? {has_elevation: lineHasElevation(feature.geometry as LineString)} : {}),
  };
}

/**
 * Conta le geometrie del file: per GPX e KML quelle convertite da togeojson, per un GeoJSON una
 * sola, perché l'uploader accetta solo una singola feature.
 *
 * @param format Formato del file.
 * @param doc Documento XML letto, `null` per un GeoJSON.
 * @returns Il numero di geometrie.
 */
function countFileFeatures(format: UgcImportInfo['format'], doc: Document | null): number {
  if (format === 'gpx') {
    return toGeoJSON.gpx(doc).features.length;
  }
  if (format === 'kml') {
    return toGeoJSON.kml(doc).features.length;
  }
  return 1;
}

/**
 * Una traccia ha gli orari se togeojson li ha messi in `coordinateProperties.times` (GPX e KML),
 * oppure se ha `locations` con orari (GeoJSON esportato da una traccia registrata).
 *
 * @param feature La traccia.
 * @returns `true` se il file porta un orario per i punti.
 */
function lineHasTime(feature: WmFeature<LineString | Point>): boolean {
  const times = feature.properties?.coordinateProperties?.times;
  const locations = feature.properties?.locations;
  return (
    (Array.isArray(times) && times.length > 0) ||
    (Array.isArray(locations) && locations.some(l => l?.time != null))
  );
}

/**
 * Un POI ha l'orario se togeojson l'ha letto dal file: `time` dal `<time>` di un `<wpt>` GPX,
 * `timestamp` dal `<TimeStamp>` di un Placemark KML.
 *
 * @param feature Il POI.
 * @returns `true` se il file porta un orario per il punto.
 */
function pointHasTime(feature: WmFeature<LineString | Point>): boolean {
  return feature.properties?.time != null || feature.properties?.timestamp != null;
}

/**
 * Una traccia ha la quota se almeno una coordinata ne porta il terzo valore.
 *
 * @param geometry La geometria della traccia.
 * @returns `true` se almeno una coordinata ha la quota.
 */
function lineHasElevation(geometry: LineString): boolean {
  return geometry.coordinates.some(c => typeof c?.[2] === 'number');
}
