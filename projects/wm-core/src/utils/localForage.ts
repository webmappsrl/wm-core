import {WmFeature} from '@wm-types/feature';
import {GeoJsonProperties, LineString, Point} from 'geojson';
import * as localforage from 'localforage';
import {downloadTiles, getTilesByGeometry, removeTiles} from '../../../../../map-core/src/utils';
import {IUser} from '@wm-core/store/auth/auth.model';

export async function clearUgcSynchronizedData(): Promise<void> {
  await Promise.all([
    synchronizedEctrack.clear(),
    synchronizedImg.clear(),
    synchronizedUgcTrack.clear(),
    synchronizedUgcPoi.clear(),
  ]);
}

export async function clearUgcDeviceData(): Promise<void> {
  await Promise.all([
    deviceUgcTrack.clear(),
    deviceUgcPoi.clear(),
    deviceImg.clear(),
  ]);
}
export async function downloadEcTrack(
  trackid: string,
  track: WmFeature<LineString>,
  callBackStatusFn = updateStatus,
): Promise<number> {
  let totalSize = 0;
  const tiles = getTilesByGeometry(track.geometry);
  totalSize += await downloadTiles(tiles, trackid, callBackStatusFn);
  totalSize += await saveEcTrack(trackid, track, callBackStatusFn, totalSize);

  return Promise.resolve(totalSize);
}

export async function downloadFile(url: string): Promise<ArrayBuffer | null> {
  if (!isValidUrl(url)) {
    console.warn(`downloadFile: Invalid URL ${url}`);
    return null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`downloadFile: Failed to fetch ${url}`);
      return null;
    }
    return response.arrayBuffer();
  } catch (e) {
    console.warn(`downloadFile: Failed to fetch ${url}`);
    return null;
  }
}

export function findImgInsideProperties(
  properties: GeoJsonProperties,
  excludeFolders = ['Resize'],
): string[] {
  let urls: string[] = [];

  function recurse(o: any) {
    if (typeof o === 'object' && o !== null) {
      for (const key in o) {
        if (o.hasOwnProperty(key)) {
          const value = o[key];
          if (typeof value === 'string' && isImageUrl(value) && !containsExcludedFolder(value)) {
            urls.push(value);
          } else if (typeof value === 'object') {
            recurse(value);
          }
        }
      }
    }
  }

  function isImageUrl(url: string): boolean {
    const imagePattern = /\.(jpeg|jpg|gif|png|svg|webp)$/i;
    const urlPattern = /^(https?:\/\/)?([^\s$.?#].[^\s]*)$/i;
    return imagePattern.test(url.toLowerCase()) && urlPattern.test(url);
  }
  function containsExcludedFolder(url: string): boolean {
    for (const folder of excludeFolders) {
      if (url.includes(folder)) {
        return true;
      }
    }
    return false;
  }
  recurse(properties);
  return urls;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAuth(): Promise<IUser | null> {
  return deviceAuth.getItem<IUser>('user');
}

export async function getDeviceUgcPoi(uuid: string): Promise<WmFeature<Point> | null> {
  return handleAsync(deviceUgcPoi.getItem<WmFeature<Point>>(`${uuid}`), 'getDeviceUgcPoi: Failed');
}

export async function getDeviceUgcPois(): Promise<WmFeature<Point>[]> {
  const keys = await handleAsync(deviceUgcPoi.keys(), 'getDeviceUgcPois: Failed');
  return keys ? await Promise.all(keys.map(key => getDeviceUgcPoi(key))) : [];
}

export async function getDeviceUgcTrack(uuid: string): Promise<WmFeature<LineString> | null> {
  return handleAsync(
    deviceUgcTrack.getItem<WmFeature<LineString>>(`${uuid}`),
    'getDeviceUgcTrack: Failed',
  );
}

export async function getDeviceUgcTracks(): Promise<WmFeature<LineString>[]> {
  const keys = await handleAsync(deviceUgcTrack.keys(), 'getDeviceUgcTracks: Failed');
  return keys ? await Promise.all(keys.map(key => getDeviceUgcTrack(key))) : [];
}

export async function getEcTrack(trackId: string): Promise<WmFeature<LineString> | null> {
  return handleAsync(
    synchronizedEctrack.getItem<WmFeature<LineString>>(`${trackId}`),
    'getEcTrack: Failed',
  );
}

export async function getEcTracks(): Promise<WmFeature<LineString>[]> {
  const keys = await handleAsync(synchronizedEctrack.keys(), 'Failed to get track keys');
  return keys ? await Promise.all(keys.map(key => getEcTrack(key))) : [];
}

export async function getImg(url: string): Promise<ArrayBuffer | string> {
  const res = await handleAsync(synchronizedImg.getItem<ArrayBuffer>(`${url}`), 'getImg: Failed');
  return res ?? url;
}

export async function getLastSynchronizedUgcPoi(): Promise<WmFeature<Point> | null> {
  try {
    const keys = await synchronizedUgcPoi.keys();

    if (keys.length === 0) {
      return null;
    }
    const lastKey = keys[keys.length - 1];
    const lastPoi = await synchronizedUgcPoi.getItem<WmFeature<Point>>(lastKey);

    return lastPoi || null;
  } catch (error) {
    console.error('getLastSynchronizedUgcPoi: Failed to get last synchronized poi', error);
    return null;
  }
}

export async function getLastSynchronizedUgcTrack(): Promise<WmFeature<LineString> | null> {
  try {
    const keys = await synchronizedUgcTrack.keys();

    if (keys.length === 0) {
      return null;
    }
    const lastKey = keys[keys.length - 1];
    const lastTrack = await synchronizedUgcTrack.getItem<WmFeature<LineString>>(lastKey);

    return lastTrack || null;
  } catch (error) {
    console.error('getLastSynchronizedUgcTrack: Failed to get last synchronized track', error);
    return null;
  }
}

export async function getSynchronizedUgcPoi(id: string): Promise<WmFeature<Point> | null> {
  return handleAsync(
    synchronizedUgcPoi.getItem<WmFeature<Point>>(`${id}`),
    'getSynchronizedUgcPoi: Failed',
  );
}

export async function getSynchronizedUgcPois(): Promise<WmFeature<Point>[]> {
  const keys = await handleAsync(synchronizedUgcPoi.keys(), 'getSynchronizedUgcPois: Failed');
  return keys ? await Promise.all(keys.map(key => getSynchronizedUgcPoi(key))) : [];
}

export async function getSynchronizedUgcTrack(id: string): Promise<WmFeature<LineString> | null> {
  return handleAsync(
    synchronizedUgcTrack.getItem<WmFeature<LineString>>(`${id}`),
    'getSynchronizedUgcTrack: Failed',
  );
}

export async function getSynchronizedUgcTracks(): Promise<WmFeature<LineString>[]> {
  const keys = await handleAsync(synchronizedUgcTrack.keys(), 'getSynchronizedUgcTracks: Failed');
  return keys ? await Promise.all(keys.map(key => getSynchronizedUgcTrack(key))) : [];
}

export async function getUgcPoi(poiId: string | number | null): Promise<WmFeature<Point> | null> {
  if (!poiId || poiId == null) return null;
  poiId = `${poiId}`;

  const a = await getSynchronizedUgcPoi(poiId);
  const b = await getDeviceUgcPoi(poiId);
  const c = await getLastSynchronizedUgcPoi();
  return a ?? b ?? c;
}

export async function getUgcPois(): Promise<WmFeature<Point>[]> {
  const deviceUgcPois = await getDeviceUgcPois();
  const synchronizedUgcPois = await getSynchronizedUgcPois();
  return [...deviceUgcPois, ...synchronizedUgcPois];
}

export async function getUgcTrack(
  trackId: string | number | null,
): Promise<WmFeature<LineString> | null> {
  if (!trackId || trackId == null) return null;
  trackId = `${trackId}`;

  const a = await getSynchronizedUgcTrack(trackId);
  const b = await getDeviceUgcTrack(trackId);
  const c = await getLastSynchronizedUgcTrack();
  return a ?? b ?? c;
}

export async function getUgcTracks(): Promise<WmFeature<LineString>[]> {
  const deviceUgcTracks = await getDeviceUgcTracks();
  const synchronizedUgcTracks = await getSynchronizedUgcTracks();
  return [...deviceUgcTracks, ...synchronizedUgcTracks];
}

async function handleAsync<T>(promise: Promise<T>, errorMsg: string): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error(errorMsg, error);
    return null;
  }
}

export async function initTrack(track: WmFeature<LineString>): Promise<void> {
  const properties = track.properties;

  if (properties.meta_data && properties.metadata.locations) {
    track.properties.locations = properties.metadata.locations;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function removeAuth(): Promise<void> {
  return deviceAuth.removeItem('user');
}

export async function removeDeviceUgcPoi(uuid: string): Promise<void> {
  await handleAsync(
    deviceUgcPoi.removeItem(uuid),
    'removeDeviceUgcPoi: Failed to remove device UGC POI',
  );
}

export async function removeDeviceUgcTrack(uuid: string): Promise<void> {
  await handleAsync(
    deviceUgcTrack.removeItem(uuid),
    'removeDeviceUgcTrack: Failed to remove device UGC track',
  );
}

export async function removeEcTrack(trackId: string): Promise<void> {
  const track = await getEcTrack(trackId);
  if (track) {
    await removeImgInsideTrack(track);
    const tiles = getTilesByGeometry(track.geometry);
    await removeTiles(tiles, trackId);
  }
  await handleAsync(
    synchronizedEctrack.removeItem(trackId),
    'removeEcTrack: Failed to remove track',
  );
}

export async function removeImg(url: string): Promise<void> {
  await handleAsync(synchronizedImg.removeItem(url), 'removeImg: Failed to remove img');
}

export async function removeImgInsideTrack(track: WmFeature<LineString>): Promise<void> {
  const properties = track.properties;
  if (!properties) return;
  const urls = findImgInsideProperties(properties);
  if (urls.length === 0) return;
  await Promise.all(urls.map(url => removeImg(url)));
}

export async function removeSynchronizedUgcPoi(id: number): Promise<void> {
  await handleAsync(synchronizedUgcPoi.removeItem(`${id}`), 'removeSynchronizedUgcPoi: Failed');
}

export async function removeSynchronizedUgcTrack(id: number): Promise<void> {
  await handleAsync(synchronizedUgcTrack.removeItem(`${id}`), 'removeSynchronizedUgcTrack: Failed');
}

export async function removeUgcPoi(poi: WmFeature<Point>): Promise<void> {
  const properties = poi.properties;
  const featureId = properties.id ?? properties.rawData?.uuid;
  const storage = properties.id ? synchronizedUgcPoi : deviceUgcPoi;
  await handleAsync(storage.removeItem(`${featureId}`), 'removeUgcPoi: Failed');
}

export async function removeUgcTrack(track: WmFeature<LineString>): Promise<void> {
  const properties = track.properties;
  const featureId = properties.id ?? properties.rawData?.uuid;
  const storage = properties.id ? synchronizedUgcTrack : deviceUgcTrack;
  await handleAsync(storage.removeItem(`${featureId}`), 'removeUgcTrack: Failed');
}

export function saveAuth(user: IUser): void {
  deviceAuth.setItem('user', user);
}

export function saveDeviceUgcTrack(feature: WmFeature<LineString>): void {
  const properties = feature.properties;
  const featureId = properties.id ?? properties.rawData?.uuid;

  deviceUgcTrack.setItem(`${featureId}`, feature);
}

export async function saveEcTrack(
  trackId: string,
  track: WmFeature<LineString>,
  callBackStatusFn = updateStatus,
  totalSize: number = 0,
): Promise<number> {
  totalSize += await saveImgInsideTrack(track, callBackStatusFn);
  const trackCopy = {
    ...track,
    properties: {
      ...track.properties,
      size: totalSize,
    },
  };
  await handleAsync(
    synchronizedEctrack.setItem(trackId, trackCopy),
    'saveEcTrack: Failed to save track',
  );
  return totalSize;
}

export async function saveImg(url: string, value: ArrayBuffer | null = null): Promise<void> {
  if (isValidUrl(url) === false) return;
  if (value == null) {
    value = await downloadFile(url);
  }
  if (value == null) {
    console.warn(`saveImg: Failed to download ${url}`);
    return;
  }
  synchronizedImg.setItem(url, value);
}

export async function saveImgInsideTrack(
  track: WmFeature<LineString>,
  callBackStatusFn = updateStatus,
): Promise<number> {
  const properties = track.properties;
  let totalSize = 0;
  if (properties == null) {
    callBackStatusFn({
      finish: false,
      media: 1,
    });
    return Promise.resolve(totalSize);
  }
  const urls = findImgInsideProperties(properties) || [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const d = await downloadFile(url);
    totalSize += (d && d.byteLength) ?? 0;
    await saveImg(url, d);
    callBackStatusFn({
      finish: false,
      media: (i + 1) / urls.length,
    });
  }
  return Promise.resolve(totalSize);
}

export async function saveUgcPoi(feature: WmFeature<Point>): Promise<void> {
  if (!feature) return;
  const properties = feature.properties;

  const featureId = properties.id ?? properties?.uuid;
  const storage = properties.id ? synchronizedUgcPoi : deviceUgcPoi;
  await handleAsync(storage.setItem(`${featureId}`, feature), 'saveUgcPoi: Failed');
}

export async function saveUgcTrack(feature: WmFeature<LineString>): Promise<void> {
  const properties = feature.properties;
  const featureId = properties.id ?? properties.uuid;
  const storage = properties.id ? synchronizedUgcTrack : deviceUgcTrack;
  await handleAsync(storage.setItem(`${featureId}`, feature), 'saveUgcTrack: Failed');
}

export async function saveUgc(feature: WmFeature<LineString | Point>): Promise<void> {
  if (!feature || !feature.geometry) return;
  if (feature.geometry.type == 'LineString') {
    await saveUgcTrack(feature as WmFeature<LineString>);
  } else {
    await saveUgcPoi(feature as WmFeature<Point>);
  }
}

export function updateStatus(status: {
  finish: boolean;
  map?: number;
  media?: number;
  data?: number;
}): void {
  console.log('Status update:', status);
}

export const synchronizedEctrack = localforage.createInstance({
  name: 'synchronized',
  storeName: 'ec-tracks',
});
export const synchronizedImg = localforage.createInstance({
  name: 'synchronized',
  storeName: 'img',
});
export const synchronizedUgcTrack = localforage.createInstance({
  name: 'synchronized',
  storeName: 'ugc-tracks',
});
export const synchronizedUgcPoi = localforage.createInstance({
  name: 'synchronized',
  storeName: 'ugc-pois',
});
export const synchronizedApi = localforage.createInstance({
  name: 'synchronized',
  storeName: 'api',
});
export const deviceUgcTrack = localforage.createInstance({
  name: 'device',
  storeName: 'ugc-tracks',
});
export const deviceUgcPoi = localforage.createInstance({
  name: 'device',
  storeName: 'ugc-pois',
});
export const deviceImg = localforage.createInstance({
  name: 'device',
  storeName: 'img',
});
export const deviceAuth = localforage.createInstance({
  name: 'device',
  storeName: 'auth',
});
