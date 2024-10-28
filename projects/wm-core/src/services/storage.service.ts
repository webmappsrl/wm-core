/**
 * Storage Service
 *
 * It provides access to the application storage for any data
 * */

import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage-angular';
import {ReplaySubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {Md5} from 'ts-md5/dist/md5';
import {IConfig} from 'wm-core/types/config';
import {
  CONFIG_JSON_STORAGE_KEY,
  IMAGE_STORAGE_PREFIX,
  INITIALIZED_FLAG_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  MBTILES_STORAGE_PREFIX,
  POI_STORAGE_PREFIX,
  TRACK_STORAGE_PREFIX,
  USER_STORAGE_KEY,
} from 'wm-core/constants/storage';
import {IGeojsonFeature, IGeojsonFeatureDownloaded, IGeojsonPoiDetailed} from 'wm-core/types/model';
import {IUser} from 'wm-core/store/auth/auth.model';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private _ready: boolean;
  private _store: Storage;

  public onReady: ReplaySubject<boolean>;

  constructor() {
    this._ready = false;
    this.onReady = new ReplaySubject<boolean>(1);
    this.onReady.next(false);
    const storage = new Storage();
    storage.create().then(
      store => {
        this._store = store;
        this._ready = true;
        this.onReady.next(this._ready);
      },
      err => {
        console.warn(err);
      },
    );
  }

  getByKey(key: string): Promise<any> {
    // console.log('------- ~ file: storage.service.ts ~ line 92 ~ StorageService ~ getByKey ~ key', key);
    return this._get(key);
  }

  getConfig(): Promise<any> {
    return this._get(CONFIG_JSON_STORAGE_KEY);
  }

  async getImage(url: string): Promise<string | Blob> {
    const path = await this.getImageFilename(url);
    if (path) {
      return await this._fileRead(path);
    } else {
      return null;
    }
  }

  async getImageFilename(url: string): Promise<string> {
    const path = await this._get(`${IMAGE_STORAGE_PREFIX}-${url}`);
    return path;
  }

  getInitializedFlag(): Promise<any> {
    return this._get(INITIALIZED_FLAG_STORAGE_KEY);
  }

  getLanguage(): Promise<any> {
    return this._get(LANGUAGE_STORAGE_KEY);
  }

  async getMBTileFilename(tileId: string): Promise<string> {
    const path = await this._get(`${MBTILES_STORAGE_PREFIX}-${tileId}`);
    return path;
  }

  async getMBTiles(tileId: string): Promise<string | Blob> {
    const path = await this.getMBTileFilename(tileId);
    if (path) {
      console.log('------- ~ StorageService ~ getMBTiles ~ path', path);
      return this._fileRead(path);
    } else {
      return '';
    }
  }

  async getPoi(id: string | number): Promise<IGeojsonPoiDetailed> {
    return this._get(`${POI_STORAGE_PREFIX}-${id}`);
  }

  async getEcTrack(id: string | number): Promise<IGeojsonFeatureDownloaded> {
    return this._get(`${TRACK_STORAGE_PREFIX}-${id}`);
  }

  getUser(): Promise<IUser> {
    return this._get(USER_STORAGE_KEY);
  }

  init(): void {
    console.log('------- ~ StorageService ~ init ~ init');
  }

  removeByKey(key: string): Promise<void> {
    return this._remove(key);
  }

  removeConfig(): Promise<void> {
    return this._remove(CONFIG_JSON_STORAGE_KEY);
  }

  async removeImage(url: string): Promise<void> {
    const path = await this.getImageFilename(url);
    if (path) {
      this._fileDelete(path);
      this._remove(`${IMAGE_STORAGE_PREFIX}-${url}`);
    }
    return;
  }

  removeInitializedFlag(): Promise<void> {
    return this._remove(INITIALIZED_FLAG_STORAGE_KEY);
  }

  removeLanguage(): Promise<void> {
    return this._remove(LANGUAGE_STORAGE_KEY);
  }

  async removeMBTiles(tileId: string): Promise<void> {
    const path = await this._get(`${MBTILES_STORAGE_PREFIX}-${tileId}`);
    if (path) {
      this._fileDelete(path);
      this._remove(`${MBTILES_STORAGE_PREFIX}-${tileId}`);
    }
    return;
  }

  async removePoi(id: string | number): Promise<void> {
    return this._remove(`${POI_STORAGE_PREFIX}-${id}`);
  }

  async removeTrack(id: string | number): Promise<void> {
    return this._remove(`${TRACK_STORAGE_PREFIX}-${id}`);
  }

  removeUser(): Promise<void> {
    return this._remove(USER_STORAGE_KEY);
  }

  setByKey(key: string, value: any): Promise<any> {
    return this._set(key, value);
  }

  setConfig(value: IConfig): Promise<void> {
    return this._set(CONFIG_JSON_STORAGE_KEY, value);
  }

  async setImage(url: string, filedata: string): Promise<void> {
    const path = this.stringTofileName(url, 'img');
    await this._fileWrite(path, filedata);
    return this._set(`${IMAGE_STORAGE_PREFIX}-${url}`, path);
  }

  setInitializedFlag(): Promise<void> {
    return this._set(INITIALIZED_FLAG_STORAGE_KEY, true);
  }

  setLanguage(value: string): Promise<void> {
    return this._set(LANGUAGE_STORAGE_KEY, value);
  }

  async setMBTiles(tileId: string, filedata: ArrayBuffer): Promise<void> {
    const path = this.stringTofileName(tileId, 'mbt');
    await this._fileWrite(path, filedata);
    return this._set(`${MBTILES_STORAGE_PREFIX}-${tileId}`, path);
  }

  async setPoi(id: string | number, poi: IGeojsonPoiDetailed): Promise<void> {
    return this._set(`${POI_STORAGE_PREFIX}-${id}`, poi);
  }

  async setTrack(
    id: string | number,
    track: IGeojsonFeature | IGeojsonFeatureDownloaded,
  ): Promise<void> {
    return this._set(`${TRACK_STORAGE_PREFIX}-${id}`, track);
  }

  setUser(user: IUser): Promise<void> {
    return this._set(USER_STORAGE_KEY, user);
  }

  stringTofileName(url: string, filetype: string): string {
    return `${Md5.hashStr(url)}.${filetype}`;
  }

  private async _fileDelete(path): Promise<void> {
    await Filesystem.deleteFile({
      path: path,
      directory: Directory.Documents,
    });
  }

  private async _fileRead(path): Promise<string | Blob> {
    let contents = await Filesystem.readFile({
      path: path,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return contents.data;
  }

  private async _fileWrite(path, data): Promise<void> {
    try {
      const result = await Filesystem.writeFile({
        path: path,
        data: data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    } catch (e) {
      console.error('Unable to write file', e);
    }
  }

  /**
   * Get the value in the storage linked to the specified key
   *
   * @param key the key of the value to retrieve
   */
  private _get(key: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      if (this._ready) {
        this._storeGet(key).then(
          res => resolve(res),
          err => {
            console.warn(err);
            reject(err);
          },
        );
      } else {
        this.onReady
          .pipe(
            filter(ready => ready),
            take(1),
          )
          .subscribe(
            () => {
              this._storeGet(key).then(
                res => resolve(res),
                err => {
                  console.warn(err);
                  reject(err);
                },
              );
            },
            err => {
              console.warn(err);
              reject();
            },
          );
      }
    });
  }

  /**
   * Remove the value linked to the key in the storage
   *
   * @param key the key to look for
   */
  private _remove(key: string): Promise<void> {
    if (this._ready) return this._store.remove(key);
    else {
      return new Promise<void>((resolve, reject) => {
        this.onReady
          .pipe(
            filter(ready => ready),
            take(1),
          )
          .subscribe(() => {
            this._store.remove(key).then(() => {
              resolve();
            }, reject);
          });
      });
    }
  }

  /**
   * Set a value in the storage
   *
   * @param key the key for the value
   * @param value the value to save
   */
  private _set(key: string, value: any): Promise<void> {
    const stringValue: string = JSON.stringify(value);

    if (this._ready) return this._store.set(key, stringValue);
    else {
      return new Promise<void>((resolve, reject) => {
        this.onReady
          .pipe(
            filter(ready => ready),
            take(1),
          )
          .subscribe(() => {
            this._store.set(key, stringValue).then(
              () => {
                resolve();
              },
              () => {
                reject();
              },
            );
          });
      });
    }
  }

  /**
   * Perform the get operation directly from the storage. This function must be called once the storage is ready
   *
   * @param key the key to get from the store
   *
   * @returns a promise that resolve when the key is retrieved
   */
  private _storeGet(key: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this._store.get(key).then(
        value => {
          let result: any;
          // console.log('------- ~ file: storage.service.ts ~ line 150 ~ StorageService ~ _storeGet ~ value', value);
          if (value) {
            try {
              result = JSON.parse(value);
            } catch (e) {
              result = value;
            }
          }
          resolve(result);
        },
        err => {
          console.warn(err);
          resolve(undefined);
        },
      );
    });
  }
}
