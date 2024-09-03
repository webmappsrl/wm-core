import {Injectable} from '@angular/core';
import {forkJoin, from, Observable} from 'rxjs';
import {CGeojsonLineStringFeature} from '../classes/features/cgeojson-line-string-feature';
import {ESaveObjType} from '../types/save.enum';
import {IRegisterItem, ITrack} from '../types/track';
import {FeatureCollection, Feature} from 'geojson';
import {EGeojsonGeometryTypes} from '../types/egeojson-geometry-types.enum';
import { ISaveIndexObj } from 'wm-core/types/save';
import { IPhotoItem, PhotoService } from './photo.service';
import { StorageService } from './storage.service';
import { UgcService } from './ugc.service';
import { WaypointSave } from 'wm-core/types/waypoint';
@Injectable({
  providedIn: 'root',
})
export class SaveService {
  private _index: {lastId: number; objects: ISaveIndexObj[]} = {
    lastId: 0,
    objects: [],
  };
  private _indexKey = 'index';

  constructor(
    private _photoService: PhotoService,
    private _storage: StorageService,
    private _ugc: UgcService,
  ) {
    this._recoverIndex();
  }

  deletePhoto(photo: IPhotoItem): Observable<any> {
    return forkJoin({
      deleteFromAPI: this._ugc.deletePhoto(+photo.id),
      deleteFromSTORAGE: from(this._deleteGeneric(photo.key)),
    });
  }

  deleteTrack(track: ITrack): Observable<any> {
    const operations: {[key: string]: Observable<any>} = {};

    if (track.sync_id) {
      operations.deleteFromAPI = this._ugc.deleteTrack(+track.sync_id);
    }
    if (track.key) {
      operations.deleteFromSTORAGE = from(this._deleteGeneric(track.key));
    }
    return forkJoin(operations);
  }

  deleteWaypoint(waypoint: WaypointSave): Observable<any> {
    const operations: {[key: string]: Observable<any>} = {};

    if (waypoint.sync_id) {
      operations.deleteFromAPI = this._ugc.deleteWaypoint(+waypoint.sync_id);
    }
    if (waypoint.key) {
      operations.deleteFromSTORAGE = from(this._deleteGeneric(waypoint.key));
    }
    return forkJoin(operations);
  }

  public async getGenerics(type: ESaveObjType): Promise<any[]> {
    const res = [];
    for (const obj of this._index.objects) {
      if (obj.type === type && !obj.deleted) {
        const ret = await this._getGenericById(obj.key);
        if (ret) {
          res.push(ret);
        }
      }
    }
    return res.reverse();
  }

  public async getPhoto(key: string): Promise<IPhotoItem> {
    return this._getGenericById(key);
  }

  public async getPhotos(): Promise<IPhotoItem[]> {
    return this.getGenerics(ESaveObjType.PHOTO);
  }

  public async getTrack(key: string): Promise<ITrack> {
    const ret = await this._getGenericById(key);
    await this._initTrack(ret);
    return ret;
  }

  public async getTrackPhotos(track: ITrack): Promise<IPhotoItem[]> {
    const coll = [];
    for (const photoKey of track.photoKeys || []) {
      const photo = await this._getGenericById(photoKey);
      coll.push(photo);
    }
    return coll;
  }

  public async getTracks(): Promise<ITrack[]> {
    const ret: ITrack[] = await this.getGenerics(ESaveObjType.TRACK);
    ret.forEach(async t => {
      await this._initTrack(t);
    });
    return ret;
  }

  /**
   * Get all the object save on storage but not on the cloud
   */
  public async getUnsavedObjects(): Promise<ISaveIndexObj[]> {
    let ret = this._index.objects.filter(X => X.saved === false);
    return ret;
  }

  public async getWaypoint(key: string): Promise<WaypointSave> {
    const wp = await this._getGenericById(key);
    for (let i = 0; i < (wp.storedPhotoKeys || []).length; i++) {
      const element = wp.storedPhotoKeys[i];
      const photo = await this._getGenericById(element);
      if (photo != null) {
        photo.rawData = window.URL.createObjectURL(await this._photoService.getPhotoFile(photo));
        wp.photos.push(photo);
      }
    }
    return wp;
  }

  public async getWaypoints(): Promise<WaypointSave[]> {
    return this.getGenerics(ESaveObjType.WAYPOINT);
  }

  /**
   * Save a track and its photos into the storage
   *
   * @param track the track to be saved
   */
  public async restoreTrack(track: ITrack): Promise<ITrack> {
    const trackCopy = Object.assign({}, track);
    const key = await this._saveGeneric(trackCopy, ESaveObjType.TRACK, true);
    trackCopy.key = key;
    return trackCopy;
  }

  /**
   * Save a photo into the storage
   *
   * @param photo the photo to be saved
   */
  public async savePhoto(photo: IPhotoItem, skipUpload = false): Promise<void> {
    await this._photoService.setPhotoData(photo);
    await this._saveGeneric(photo, ESaveObjType.PHOTO, skipUpload);
  }

  /**
   * Save a photo into the storage
   *
   * @param photo the photo to be saved
   */
  public async savePhotos(photos: Array<IPhotoItem>, skipUpload = false): Promise<void> {
    for (let photo of photos) {
      await this.savePhoto(photo, skipUpload);
    }
  }

  /**
   * Save a track and its photos into the storage
   *
   * @param track the track to be saved
   */
  public async saveTrack(track: ITrack, skipUload = false): Promise<ITrack> {
    const trackCopy = Object.assign({}, track);
    const key = await this._saveGeneric(trackCopy, ESaveObjType.TRACK, skipUload);
    trackCopy.key = key;
    return trackCopy;
  }

  /**
   * Save a waypoint into the storage
   *
   * @param waypoint the waypoint to be saved
   */
  public async saveWaypoint(waypoint: WaypointSave, skipUpload = false): Promise<WaypointSave> {
    const waypointCopy = Object.assign({}, waypoint);
    const key = await this._saveGeneric(waypointCopy, ESaveObjType.WAYPOINT, skipUpload);
    waypointCopy.key = key;
    return waypointCopy;
  }

  async syncUgc(): Promise<void> {
    const _ugcUgcTracks: FeatureCollection = await this._ugc.getUgcTracks();
    const _ugcUgcPois: FeatureCollection = await this._ugc.getUgcPois();
    const _ugcUgcMedias: FeatureCollection = await this._ugc.getUgcMedias();
    const deviceUgcMedias: any[] = await this.getPhotos();
    const deviceUgcTracks = await this.getTracks();
    const deviceUgcPois = await this.getWaypoints();
    if (_ugcUgcTracks?.features && _ugcUgcTracks?.features.length > deviceUgcTracks.length) {
      const deviceUgcTrackNames = deviceUgcTracks.map(f => f.title);
      const deviceUgcTrackUUID = deviceUgcTracks.map(f => f.uuid);
      _ugcUgcTracks.features
        .filter(f => {
          const prop = f?.properties;
          const rawData = JSON.parse(prop.raw_data) ?? undefined;
          const name = prop?.name;
          const uuid = rawData?.uuid;
          return (
            deviceUgcTrackNames.indexOf(name) < 0 &&
            ((uuid && deviceUgcTrackUUID.indexOf(uuid) < 0) || uuid == null)
          );
        })
        .map(f => this._convertFeatureToITrack(f))
        .forEach(track => this.saveTrack(track, true));
    }
    if (_ugcUgcPois?.features && _ugcUgcPois?.features.length > deviceUgcPois.length) {
      const deviceUgcPoisNames = deviceUgcPois.map(f => f.title);
      const deviceUgcPoisUUID = deviceUgcPois.map(f => f.uuid);
      _ugcUgcPois.features
        .filter(f => {
          const prop = f?.properties;
          const rawData = JSON.parse(prop.raw_data) ?? undefined;
          const name = prop?.name;
          const uuid = rawData?.uuid;
          console.log(f);
          return (
            deviceUgcPoisNames.indexOf(name) < 0 &&
            ((uuid && deviceUgcPoisUUID.indexOf(uuid) < 0) || uuid == null)
          );
        })
        .map(f => this._convertFeatureToWaypointSave(f))
        .forEach(poi => this.saveWaypoint(poi, true));
    }
    if (_ugcUgcMedias?.features && _ugcUgcMedias?.features.length > deviceUgcMedias.length) {
      const deviceUgcMediasNames = deviceUgcMedias.map(f => f.title);
      const deviceUgcMediasUUID = deviceUgcMedias.map(f => f.uuid);
      _ugcUgcMedias.features
        .filter(f => {
          const prop = f?.properties;
          const rawData = JSON.parse(prop.raw_data) ?? undefined;
          const name = prop?.name;
          const uuid = rawData?.uuid;
          return (
            deviceUgcMediasNames.indexOf(name) < 0 &&
            ((uuid && deviceUgcMediasUUID.indexOf(uuid) < 0) || uuid == null)
          );
        })
        .map(f => this._convertFeatureToMedia(f))
        .forEach(media => this.savePhoto(media, true));
    }

    const _ugcUgcPoisMap = new Map();
    _ugcUgcPois.features.forEach(f => {
      const prop = f?.properties;
      const rawData = JSON.parse(prop.raw_data) ?? undefined;
      const uuid = rawData?.uuid;
      if (uuid) {
        _ugcUgcPoisMap.set(uuid, f?.properties?.id);
      }
    });
    deviceUgcPois.forEach(async poi => {
      const syncId = _ugcUgcPoisMap.get(poi.uuid);
      if (syncId) {
        poi.sync_id = syncId;
      } else if (poi.id) {
        console.log(poi.id);
      }
      await this.updateWaypoint(poi);
      await this._updateGeneric(poi.key, poi);
    });

    const _ugcUgcTracksMap = new Map();
    _ugcUgcTracks.features.forEach(async f => {
      const prop = f?.properties;
      const rawData = JSON.parse(prop.raw_data) ?? undefined;
      const uuid = rawData?.uuid;
      if (uuid) {
        _ugcUgcTracksMap.set(uuid, f?.properties?.id);
      }
    });
    deviceUgcTracks.forEach(async track => {
      const syncId = _ugcUgcTracksMap.get(track.uuid);
      if (syncId) {
        track.sync_id = syncId;
      } else if (track.id) {
        track.sync_id = track.id;
      }
      await this._updateGeneric(track.key, track);
    });
  }

  public async updateTrack(newTrack: ITrack): Promise<void> {
    const trackToSave = JSON.parse(JSON.stringify(newTrack));
    const originalTrack = await this.getTrack(trackToSave.key);

    const photoKeys: string[] = [];
    trackToSave.photoKeys = [];
    for (const photoTrack of trackToSave.photos) {
      photoKeys.push(photoTrack.key);
      trackToSave.photoKey.push(photoTrack.key);
    }
    trackToSave.photos = null;
    const deletedPhotos = originalTrack.photoKeys.filter(x => photoKeys.find(y => x !== y));

    for (const photokey of deletedPhotos) {
      //this.deleteGeneric(photokey);
    }
    trackToSave.photoKeys = photoKeys;
    this._updateGeneric(trackToSave.key, trackToSave);
  }

  public async updateWaypoint(newWaypoint: WaypointSave): Promise<void> {
    const waypointToSave = JSON.parse(JSON.stringify(newWaypoint));
    this._updateGeneric(waypointToSave.key, waypointToSave);
  }

  public async uploadUnsavedContents(): Promise<void> {
    //TODO what for edited or deleted contents?

    let contents = await this.getUnsavedObjects();
    contents = contents.sort((a, b) =>
      a.type == (ESaveObjType.PHOTO || a.type == ESaveObjType.PHOTOTRACK) ? 1 : -1,
    );

    for (let i = 0; i < contents.length; i++) {
      const indexObj = this._index.objects.find(x => x.key === contents[i].key);
      switch (contents[i].type) {
        case ESaveObjType.PHOTO:
          const photo: IPhotoItem = await this._getGenericById(contents[i].key);
          indexObj.saved = true;
          this._updateGeneric(contents[i].key, photo);
          await this._photoService.setPhotoData(photo);
          const resP = await this._ugc.savePhoto(photo);
          if (resP && !resP.error && resP.id) {
            indexObj.saved = true;
            photo.id = resP.id;
            photo.sync_id = resP.id;
            this._updateGeneric(contents[i].key, photo);
          } else {
            indexObj.saved = false;
            this._updateGeneric(contents[i].key, photo);
          }
          break;

        case ESaveObjType.WAYPOINT:
          const waypoint: WaypointSave = await this.getWaypoint(contents[i].key);

          if (waypoint?.photos?.length) {
            let i: number = 0;
            while (i < waypoint.photos.length) {
              const photo: IPhotoItem = waypoint.photos[i];
              const photoKey = await this._savePhotoTrack(photo);
              const photoStored: IPhotoItem = await this._getGenericById(photoKey);
              this._updateGeneric(photoKey, photoStored);
              try {
                const resP = await this._ugc.savePhoto(photo);
                if (resP && !resP.error && resP.id) {
                  if (!waypoint.photoKeys) waypoint.photoKeys = [];
                  if (!waypoint.storedPhotoKeys) waypoint.storedPhotoKeys = [];
                  waypoint.photoKeys.push(resP.id);
                  waypoint.storedPhotoKeys.push(photoKey);
                  waypoint.photos.splice(i, 1); // Photo uploaded correctly, delete it from the photos to upload
                } else {
                  console.warn('A waypoint photo could not be uploaded');
                  i++;
                }
              } catch (e) {
                console.warn('A waypoint photo could not be uploaded');
                i++;
              }
            }
          }

          if (!waypoint?.photos?.length) {
            let poiTo_ugc = null;
            try {
              poiTo_ugc = {
                ...waypoint,
                ...{
                  geojson: {
                    type: EGeojsonGeometryTypes.POINT,
                    coordinates: [waypoint.position.longitude, waypoint.position.latitude],
                  },
                },
              };
            } catch (e) {
              console.error(e);
              indexObj.saved = true;
              this._updateGeneric(contents[i].key, waypoint);
            }
            const resW = await this._ugc.saveWaypoint(waypoint);
            if (resW && !resW.error && resW.id) {
              indexObj.saved = true;
              waypoint.id = resW.id;
              waypoint.sync_id = resW.id;
              this._updateGeneric(contents[i].key, waypoint);
            } else this._updateGeneric(contents[i].key, waypoint);
          } else this._updateGeneric(contents[i].key, waypoint);
          break;

        case ESaveObjType.TRACK:
          const track: ITrack = await this.getTrack(contents[i].key);

          if (track?.photos?.length) {
            let i: number = 0;
            while (i < track.photos.length) {
              const photo: IPhotoItem = track.photos[i];
              const photoKey = await this._savePhotoTrack(photo);
              const photoStored: IPhotoItem = await this._getGenericById(photoKey);
              this._updateGeneric(photoKey, photoStored);
              try {
                const resP = await this._ugc.savePhoto(photo);
                if (resP && !resP.error && resP.id) {
                  if (!track.photoKeys) track.photoKeys = [];
                  if (!track.storedPhotoKeys) track.storedPhotoKeys = [];
                  track.photoKeys.push(resP.id);
                  track.storedPhotoKeys.push(photoKey);
                  track.photos.splice(i, 1); // Photo uploaded correctly, delete it from the photos to upload
                } else {
                  console.warn('A track photo could not be uploaded');
                  i++;
                }
              } catch (e) {
                console.warn('A track photo could not be uploaded');
                i++;
              }
            }
          }

          if (!track?.photos?.length) {
            let trackTo_ugc = null;
            try {
              trackTo_ugc = {
                ...track,
                ...{
                  geojson: {
                    geometry: {
                      type:
                        (track as any).geojson?.geometry?.type ||
                        (track as any)?.geometry?.type ||
                        null,
                      coordinates:
                        ((track as any).geojson?.geometry?.coordinates ||
                          (track as any).geometry?.coordinates) ??
                        [],
                    },
                  },
                },
              };
            } catch (e) {
              console.error(e);
              indexObj.saved = true;
              this._updateGeneric(contents[i].key, track);
            }
            const resT = await this._ugc.saveTrack(trackTo_ugc as any);
            if (resT && !resT.error && resT.id) {
              indexObj.saved = true;
              track.id = resT.id;
              track.sync_id = resT.id;
              this._updateGeneric(contents[i].key, track);
            } else this._updateGeneric(contents[i].key, track);
          } else this._updateGeneric(contents[i].key, track);
          break;

        case ESaveObjType.PHOTOTRACK:
          break;
      }
      await this._updateIndex();
    }
    this.syncUgc();
  }

  private _convertFeatureToITrack(feature: Feature): ITrack {
    const prop = feature.properties;
    const rawData = prop.raw_data ? JSON.parse(prop.raw_data) : null;
    const metaData = prop.metadata ? JSON.parse(prop.metadata) : null;
    let geojson: CGeojsonLineStringFeature =
      Object.assign(new CGeojsonLineStringFeature(), feature.geometry) ?? null;
    geojson.addProperties(rawData);
    geojson.addProperties(metaData);

    const ret = {
      activity: rawData.activity ?? null,
      geojson,
      description: prop.description ?? null,
      id: prop.id ?? null,
      formId: rawData.id ?? null,
      metadata: metaData ?? null,
      photoKeys: prop.photoKeys ?? null,
      photos: prop.photos ?? null,
      rawData: rawData ?? null,
      storedPhotoKeys: prop.storedPhotoKeys ?? null,
      title: prop.name ?? null,
      date: prop.date,
      uuid: prop.uuid,
    } as ITrack;
    return {...ret, ...rawData};
  }

  //getPhotoData
  private _convertFeatureToMedia(feature: Feature): IPhotoItem {
    const prop = feature.properties;
    // const url = `https://_ugc.webmapp.it/storage/${prop.relative_url}`;
    const rawData = prop.raw_data ? JSON.parse(prop.raw_data) : null;
    return {
      photoURL: prop.url,
      position: rawData.position,
      description: prop.description ?? '',
      date: prop.updated_at,
      uuid: rawData.uuid,
      id: prop.id,
    } as IPhotoItem;
  }

  private _convertFeatureToWaypointSave(feature: Feature): WaypointSave {
    const prop = feature.properties;
    const rawData = prop.raw_data ? JSON.parse(prop.raw_data) : null;
    const ret = {
      city: rawData.city ?? null,
      date: prop.date,
      description: prop.description ?? null,
      displayPosition: rawData.displayPosition ?? null,
      id: prop.id ?? null,
      formId: rawData.id ?? null,
      nominatim: rawData.nominatim ?? null,
      photos: rawData.photos ?? [],
      position: {
        longitude: (feature.geometry as any).coordinates[0],
        latitude: (feature.geometry as any).coordinates[1],
      },
      title: prop.name ?? null,
      uuid: rawData.uuid,
    } as WaypointSave;
    return {...ret, ...rawData};
  }

  private async _deleteGeneric(key): Promise<any> {
    await this._storage.removeByKey(key);
    const indexObj = this._index.objects.find(x => x.key === key);
    indexObj.deleted = true;
    await this._updateIndex();
  }

  private _generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async _getGenericById(key): Promise<any> {
    let returnObj = null;
    const ret = await this._storage.getByKey(key);
    if (ret) {
      returnObj = ret;
      returnObj.key = key;
    }
    return returnObj;
  }

  private _getLastId(): number {
    return this._index.lastId++;
  }

  private async _initTrack(track: ITrack): Promise<void> {
    const gj = track.geojson;
    try {
      track.geojson = Object.assign(new CGeojsonLineStringFeature(), gj);
    } catch (_) {}
    for (let i = 0; i < (track.storedPhotoKeys || []).length; i++) {
      const element = track.storedPhotoKeys[i];
      const photo = await this._getGenericById(element);
      if (photo != null) {
        photo.rawData = window.URL.createObjectURL(await this._photoService.getPhotoFile(photo));
        track.photos.push(photo);
      }
    }
    if (track.metadata && typeof track.metadata === 'string') {
      let metadata = JSON.parse(track.metadata);
      if (metadata && metadata.locations) {
        track.geojson.setProperty('locations', metadata.locations);
      }
    }
  }

  private async _recoverIndex(): Promise<void> {
    const ret = await this._storage.getByKey(this._indexKey);
    if (ret) {
      this._index = ret;
    }
  }

  private async _saveGeneric(
    object: IRegisterItem,
    type: ESaveObjType,
    skipUpload = false,
  ): Promise<string> {
    object.uuid = object.uuid ? object.uuid : this._generateUUID();
    const key = type + this._getLastId();
    const insertObj: ISaveIndexObj = {
      key,
      type,
      saved: skipUpload,
      edited: false,
    };
    this._index.objects.push(insertObj);
    await this._storage.setByKey(key, object);
    await this._updateIndex();

    if (!skipUpload) {
      //async call
      this.uploadUnsavedContents();
    }

    return key;
  }

  private async _savePhotoTrack(photo: IPhotoItem): Promise<string> {
    await this._photoService.setPhotoData(photo);
    return await this._saveGeneric(photo, ESaveObjType.PHOTO, true);
  }

  private async _updateGeneric(key, value: IRegisterItem): Promise<void> {
    await this._storage.removeByKey(key);
    await this._storage.setByKey(key, value);
    const indexObj = this._index.objects.find(x => x.key === key);
    indexObj.edited = true;
    await this._updateIndex();
  }

  private async _updateIndex(): Promise<void> {
    await this._storage.setByKey(this._indexKey, this._index);
  }
}
