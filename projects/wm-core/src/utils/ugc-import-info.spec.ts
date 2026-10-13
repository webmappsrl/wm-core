import * as toGeoJSON from '@tmcw/togeojson';
import {FeatureCollection, LineString, Point} from 'geojson';
import {WmFeature} from '@wm-types/feature';

import {buildUgcImportInfo} from './ugc-import-info';

const LAST_MODIFIED = Date.UTC(2026, 8, 30, 8, 12);

/**
 * Crea un `File` di prova con data di modifica fissa.
 *
 * @param content Testo del file.
 * @param name Nome del file, con estensione.
 * @returns Il file.
 */
function fileOf(content: string, name: string): File {
  return new File([content], name, {lastModified: LAST_MODIFIED});
}

/**
 * Converte come fa l'uploader: prima LineString del file, altrimenti primo Point.
 *
 * @param fc FeatureCollection convertita da togeojson.
 * @returns La feature che l'uploader salverebbe.
 */
function firstFeature(fc: FeatureCollection): WmFeature<LineString | Point> {
  const line = fc.features.find(f => f.geometry?.type === 'LineString');
  const point = fc.features.find(f => f.geometry?.type === 'Point');
  return (line ?? point) as WmFeature<LineString | Point>;
}

/**
 * Converte un GPX e restituisce la feature che l'uploader salverebbe.
 *
 * @param content Testo GPX.
 * @returns La feature.
 */
function gpxFeature(content: string): WmFeature<LineString | Point> {
  return firstFeature(toGeoJSON.gpx(new DOMParser().parseFromString(content, 'text/xml')));
}

const GPX_ONE_TRACK = `<?xml version="1.0"?>
<gpx version="1.1" creator="Garmin Connect" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Tappa 1</name><trkseg>
    <trkpt lat="44.49" lon="11.34"><ele>54</ele><time>2026-09-20T07:00:00Z</time></trkpt>
    <trkpt lat="44.48" lon="11.33"><ele>60</ele><time>2026-09-20T07:05:00Z</time></trkpt>
    <trkpt lat="44.47" lon="11.32"><ele>72</ele><time>2026-09-20T07:10:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

const GPX_TWO_TRACKS = `<?xml version="1.0"?>
<gpx version="1.1" creator="Strava" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="44.40" lon="11.30"><name>Rifugio</name></wpt>
  <trk><trkseg>
    <trkpt lat="44.49" lon="11.34"/><trkpt lat="44.48" lon="11.33"/><trkpt lat="44.47" lon="11.32"/>
  </trkseg></trk>
  <trk><trkseg>
    <trkpt lat="44.46" lon="11.31"/><trkpt lat="44.45" lon="11.30"/>
  </trkseg></trk>
</gpx>`;

const GPX_NO_CREATOR = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg><trkpt lat="44.49" lon="11.34"/><trkpt lat="44.48" lon="11.33"/></trkseg></trk>
</gpx>`;

const GPX_POI = `<?xml version="1.0"?>
<gpx version="1.1" creator="Komoot" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="44.40" lon="11.30"><ele>312</ele><time>2026-09-20T09:00:00Z</time><name>Fonte</name></wpt>
</gpx>`;

const KML_NO_TIME = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Tappa</name>
  <LineString><coordinates>11.34,44.49,54 11.33,44.48,60 11.32,44.47,72</coordinates></LineString>
</Placemark></Document></kml>`;

describe('buildUgcImportInfo (oc:8764)', () => {
  it('GPX con creator, orari e quote', () => {
    const file = fileOf(GPX_ONE_TRACK, 'via-degli-dei-tappa-1.gpx');
    const info = buildUgcImportInfo(file, GPX_ONE_TRACK, gpxFeature(GPX_ONE_TRACK));

    expect(info).toEqual({
      format: 'gpx',
      file_name: 'via-degli-dei-tappa-1.gpx',
      file_size: file.size,
      file_last_modified: '2026-09-30T08:12:00.000Z',
      creator: 'Garmin Connect',
      points: 3,
      file_features: 1,
      has_time: true,
      has_elevation: true,
    });
  });

  it('GPX con più tracce: points conta la UGC salvata, file_features tutto il file', () => {
    const file = fileOf(GPX_TWO_TRACKS, 'tre-giorni.gpx');
    const info = buildUgcImportInfo(file, GPX_TWO_TRACKS, gpxFeature(GPX_TWO_TRACKS));

    expect(info.points).toBe(3);
    expect(info.file_features).toBe(3);
    expect(info.has_time).toBeFalse();
    expect(info.has_elevation).toBeFalse();
  });

  it('GPX senza creator: la chiave non c\'è', () => {
    const file = fileOf(GPX_NO_CREATOR, 'anonimo.gpx');
    const info = buildUgcImportInfo(file, GPX_NO_CREATOR, gpxFeature(GPX_NO_CREATOR));

    expect('creator' in info).toBeFalse();
  });

  it('KML senza orari', () => {
    const file = fileOf(KML_NO_TIME, 'tappa.KML');
    const feature = firstFeature(
      toGeoJSON.kml(new DOMParser().parseFromString(KML_NO_TIME, 'text/xml')),
    );
    const info = buildUgcImportInfo(file, KML_NO_TIME, feature);

    expect(info.format).toBe('kml');
    expect(info.points).toBe(3);
    expect(info.file_features).toBe(1);
    expect(info.has_time).toBeFalse();
    expect(info.has_elevation).toBeTrue();
    expect('creator' in info).toBeFalse();
  });

  it('GeoJSON senza quote', () => {
    const feature = {
      type: 'Feature',
      properties: {name: 'Tappa'},
      geometry: {type: 'LineString', coordinates: [[11.34, 44.49], [11.33, 44.48]]},
    } as WmFeature<LineString>;
    const content = JSON.stringify(feature);
    const info = buildUgcImportInfo(fileOf(content, 'tappa.geojson'), content, feature);

    expect(info.format).toBe('geojson');
    expect(info.points).toBe(2);
    expect(info.file_features).toBe(1);
    expect(info.has_time).toBeFalse();
    expect(info.has_elevation).toBeFalse();
  });

  it('GeoJSON esportato da una traccia registrata: has_time da locations', () => {
    const feature = {
      type: 'Feature',
      properties: {
        locations: [
          {latitude: 44.49, longitude: 11.34, time: 1758351600000},
          {latitude: 44.48, longitude: 11.33, time: 1758351900000},
        ],
      },
      geometry: {type: 'LineString', coordinates: [[11.34, 44.49, 54], [11.33, 44.48, 60]]},
    } as unknown as WmFeature<LineString>;
    const content = JSON.stringify(feature);
    const info = buildUgcImportInfo(fileOf(content, 'registrata.geojson'), content, feature);

    expect(info.has_time).toBeTrue();
    expect(info.has_elevation).toBeTrue();
  });

  it('POI GPX: has_time dal punto e niente has_elevation', () => {
    const file = fileOf(GPX_POI, 'fonte.gpx');
    const info = buildUgcImportInfo(file, GPX_POI, gpxFeature(GPX_POI));

    expect(info.points).toBe(1);
    expect(info.file_features).toBe(1);
    expect(info.has_time).toBeTrue();
    expect(info.creator).toBe('Komoot');
    expect('has_elevation' in info).toBeFalse();
  });

  it('POI KML con TimeStamp: has_time vero', () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Fonte</name>
  <TimeStamp><when>2026-09-20T09:00:00Z</when></TimeStamp>
  <Point><coordinates>11.30,44.40,312</coordinates></Point>
</Placemark></Document></kml>`;
    const feature = firstFeature(toGeoJSON.kml(new DOMParser().parseFromString(kml, 'text/xml')));
    const info = buildUgcImportInfo(fileOf(kml, 'fonte.kml'), kml, feature);

    expect(info.has_time).toBeTrue();
  });

  it('data di modifica non valida: il campo manca, il resto c\'è', () => {
    const file = fileOf(GPX_ONE_TRACK, 'tappa.gpx');
    Object.defineProperty(file, 'lastModified', {value: NaN});
    const info = buildUgcImportInfo(file, GPX_ONE_TRACK, gpxFeature(GPX_ONE_TRACK));

    expect('file_last_modified' in info).toBeFalse();
    expect(info.format).toBe('gpx');
    expect(info.points).toBe(3);
  });

  it('sovrascrive un import già presente nel file', () => {
    const feature = {
      type: 'Feature',
      properties: {import: {format: 'x'}},
      geometry: {type: 'LineString', coordinates: [[11.34, 44.49], [11.33, 44.48]]},
    } as unknown as WmFeature<LineString>;
    const content = JSON.stringify(feature);
    const info = buildUgcImportInfo(fileOf(content, 'reimport.geojson'), content, feature);

    expect(info.format).toBe('geojson');
  });
});
