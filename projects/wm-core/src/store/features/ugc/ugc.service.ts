import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {
  getDeviceUgcPoi,
  getDeviceUgcPois,
  getDeviceUgcTracks,
  getImg,
  getSynchronizedUgcPoi,
  getSynchronizedUgcPois,
  getSynchronizedUgcTracks,
  getUgcPois,
  getUgcTracks,
  removeDeviceUgcPoi,
  removeDeviceUgcTrack,
  saveImg,
  saveUgcPoi,
  saveUgcTrack,
} from '@wm-core/utils/localForage';
import {WmFeature, WmFeatureCollection, SyncUgcTypes} from '@wm-types/feature';

import {LineString, Point} from 'geojson';
import {Observable, from, of} from 'rxjs';

import {isLogged, isLoggedAndHasPrivacyAgree} from './../../auth/auth.selectors';
import {updateUgcPois, updateUgcTracks} from './ugc.actions';
import {catchError, map, take, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UgcService {
  private isSyncingUgcPoi = false;
  private isSyncingUgcTrack = false;
  private syncQueue: Promise<void> = Promise.resolve();

  isLogged$ = this._store.select(isLogged);
  isLoggedAndHasPrivacyAgree$ = this._store.select(isLoggedAndHasPrivacyAgree);

  constructor(
    private _http: HttpClient,
    private _store: Store,
    private _environmentSvc: EnvironmentService,
  ) {

  }

  deleteApiMedia(id: number): Observable<any> {
    return this._http.get(`${this._environmentSvc.origin}/api/v2/ugc/media/delete/${id}`);
  }

  deleteApiPoi(id: number): Observable<any> {
    return this._http.get(`${this._environmentSvc.origin}/api/v2/ugc/poi/delete/${id}`);
  }

  deleteApiTrack(id: number): Observable<any> {
    return this._http.get(`${this._environmentSvc.origin}/api/v2/ugc/track/delete/${id}`);
  }

  deletePoi(poi: WmFeature<Point>): Observable<any> {
    const id = poi.properties.id;
    return this.deleteApiPoi(id).pipe(
      take(1),
      tap(() => this.syncUgc('poi')),
    );
  }

  deleteTrack(track: WmFeature<LineString>): Observable<any> {
    if (track.properties.id) {
      return this.deleteApiTrack(track.properties.id).pipe(
        take(1),
        tap(() => this.syncUgc('track')),
      );
    }
    if (track.properties.uuid) {
      return of(removeDeviceUgcTrack(track.properties.uuid));
    }
    return of({error: 'Track id not found'});
  }

  private async _fetchUgcPois(): Promise<void> {
    try {
      // Check if user is logged in AND has privacy agree before fetching from API
      const isLoggedAndHasPrivacyAgree = await from(
        this.isLoggedAndHasPrivacyAgree$.pipe(take(1)),
      ).toPromise();
      if (!isLoggedAndHasPrivacyAgree) {
        console.log(
          '🔒 User not logged in or privacy agree not given, skipping UGC POI fetch from API',
        );
        return;
      }

      const apiUgcPois = await this._getApiPois();
      if (apiUgcPois == null) {
        return;
      }
      const cloudUgcPois = await getSynchronizedUgcPois();

      for (let apiUgcPoi of apiUgcPois.features) {
        const cloudPoi = cloudUgcPois.find(
          poi => poi.properties.uuid === apiUgcPoi.properties.uuid,
        );
        if (!cloudPoi || this._isFeatureModified(apiUgcPoi, cloudPoi)) {
          await saveUgcPoi(apiUgcPoi);
          // console.log(`fetchUgcPois sync: ${apiUgcPoi.properties.id}`);
        }
      }
      // console.log('fetchUgcPois: Synchronization completed successfully');
    } catch (error) {
      console.error('fetchUgcPois: Error during synchronization:', error);
    }
  }

  private async _fetchUgcTracks(): Promise<void> {
    try {
      // Check if user is logged in AND has privacy agree before fetching from API
      const isLoggedAndHasPrivacyAgree = await from(
        this.isLoggedAndHasPrivacyAgree$.pipe(take(1)),
      ).toPromise();
      if (!isLoggedAndHasPrivacyAgree) {
        console.log(
          '🔒 User not logged in or privacy agree not given, skipping UGC Track fetch from API',
        );
        return;
      }

      const apiUgcTracks = await this._getApiTracks();
      if (apiUgcTracks == null) {
        return;
      }
      const synchronizedUgcTracks = await getSynchronizedUgcTracks();

      for (let apiTrack of apiUgcTracks.features) {
        const synchronizedUgcTrack = synchronizedUgcTracks.find(
          track => track.properties.uuid === apiTrack.properties.uuid,
        );
        if (!synchronizedUgcTrack || this._isFeatureModified(apiTrack, synchronizedUgcTrack)) {
          await saveUgcTrack(apiTrack);
          // console.log(`fetchUgcTracks sync: ${apiTrack.properties.id}`);
        }
      }
      // console.log('fetchUgcTracks: Synchronization completed successfully');
    } catch (error) {
      console.error('fetchUgcTracks: Error during synchronization:', error);
    }
  }

  private async _getApiPois(): Promise<WmFeatureCollection<Point>> {
    return await this._http
      .get<WmFeatureCollection<Point>>(`${this._environmentSvc.origin}/api/v2/ugc/poi/index`)
      .pipe(catchError(_ => of(null)))
      .toPromise();
  }

  private async _getApiTracks(): Promise<WmFeatureCollection<LineString>> {
    return await this._http
      .get<WmFeatureCollection<LineString>>(`${this._environmentSvc.origin}/api/v2/ugc/track/index`)
      .pipe(catchError(_ => of(null)))
      .toPromise();
  }

  getPoi(poiId: string): Observable<WmFeature<Point> | null> {
    return new Observable<WmFeature<Point> | null>(observer => {
      getDeviceUgcPoi(poiId)
        .then(devicePoi => {
          if (devicePoi) {
            observer.next(devicePoi);
            observer.complete();
          } else {
            return getSynchronizedUgcPoi(poiId);
          }
        })
        .then(cloudPoi => {
          if (cloudPoi) {
            observer.next(cloudPoi);
          } else {
            observer.next(null);
          }
          observer.complete();
        })
        .catch(error => {
          console.error('getPoi:', error);
          observer.next(null);
          observer.complete();
        });
    });
  }

  loadUgcPois() {
    return from(getUgcPois()).pipe(map(ugcPoiFeatures => updateUgcPois({ugcPoiFeatures})));
  }

  loadUgcTracks() {
    return from(getUgcTracks()).pipe(map(ugcTrackFeatures => updateUgcTracks({ugcTrackFeatures})));
  }

  private async _pushUgcPois(): Promise<void> {
    try {
      // Check if user is logged in AND has privacy agree before pushing to API
      const isLoggedAndHasPrivacyAgree = await from(
        this.isLoggedAndHasPrivacyAgree$.pipe(take(1)),
      ).toPromise();
      if (!isLoggedAndHasPrivacyAgree) {
        console.log(
          '🔒 User not logged in or privacy agree not given, skipping UGC POI push to API',
        );
        return;
      }

      let deviceUgcPois = await getDeviceUgcPois();
      let synchronizedUgcPois = await getSynchronizedUgcPois();

      for (let deviceUgcPoi of deviceUgcPois) {
        const existingPoi = synchronizedUgcPois.find(
          poi => poi.properties.uuid === deviceUgcPoi.properties.uuid,
        );

        if (existingPoi) {
          await removeDeviceUgcPoi(deviceUgcPoi.properties.uuid);
          // console.log(  `POI with UUID ${deviceUgcPoi.properties.uuid} already exists. Skipping save.` );
          continue;
        }

        // If privacy agree is active, sync ALL unsynchronized UGC
        console.log(`🔄 Syncing POI ${deviceUgcPoi.properties.uuid} (privacy agree is active)`);

        try {
          const res = await this.saveApiPoi(deviceUgcPoi);
          if (res) {
            await removeDeviceUgcPoi(deviceUgcPoi.properties.uuid);
            synchronizedUgcPois.push(deviceUgcPoi); // Update the list of synchronized POIs
            console.log(
              `✅ POI with UUID ${deviceUgcPoi.properties.uuid} synchronized and removed.`,
            );
          }
        } catch (poiError) {
          console.error(
            `Error during synchronization of POI ${deviceUgcPoi.properties.uuid}:`,
            poiError,
          );
        }
      }
      console.log('✅ POI synchronization completed successfully');
    } catch (error) {
      console.error('Error during POI synchronization:', error);
    }
  }

  private async _pushUgcTracks(): Promise<void> {
    try {
      // Check if user is logged in AND has privacy agree before pushing to API
      const isLoggedAndHasPrivacyAgree = await from(
        this.isLoggedAndHasPrivacyAgree$.pipe(take(1)),
      ).toPromise();
      if (!isLoggedAndHasPrivacyAgree) {
        console.log(
          '🔒 User not logged in or privacy agree not given, skipping UGC Track push to API',
        );
        return;
      }

      let deviceUgcTracks = await getDeviceUgcTracks();
      let synchronizedUgcTracks = await getSynchronizedUgcTracks();

      for (let deviceUgcTrack of deviceUgcTracks) {
        const existingTrack = synchronizedUgcTracks.find(
          track => track.properties.uuid === deviceUgcTrack.properties.uuid,
        );

        if (existingTrack) {
          await removeDeviceUgcTrack(deviceUgcTrack.properties.uuid);
          // console.log(`Track with UUID ${deviceUgcTrack.properties.uuid} already exists. Skipping save.`);
          continue;
        }

        // If privacy agree is active, sync ALL unsynchronized UGC
        console.log(`🔄 Syncing Track ${deviceUgcTrack.properties.uuid} (privacy agree is active)`);

        try {
          const res = await this.saveApiTrack(deviceUgcTrack);
          if (res) {
            await removeDeviceUgcTrack(deviceUgcTrack.properties.uuid);
            synchronizedUgcTracks.push(deviceUgcTrack); // Update the list of synchronized tracks
            console.log(
              `✅ Track with UUID ${deviceUgcTrack.properties.uuid} synchronized and removed.`,
            );
          }
        } catch (trackError) {
          console.error(
            `Error during synchronization of track ${deviceUgcTrack.properties.uuid}:`,
            trackError,
          );
        }
      }
      console.log('✅ Track synchronization completed successfully');
    } catch (error) {
      console.error('Error during track synchronization:', error);
    }
  }

  /**
   * Save a waypoint as a EC POI to the Geohub
   *
   * @param waypoint the waypoint to save
   *
   * @returns
   */
  async saveApiPoi(poi: WmFeature<Point>): Promise<WmFeature<Point> | null> {
    if (poi != null) {
      const data = await this._buildFormData(poi);

      return this._http
        .post<WmFeature<Point>>(`${this._environmentSvc.origin}/api/v2/ugc/poi/store`, data)
        .pipe(catchError(_ => of(null)))
        .toPromise();
    }

    return Promise.resolve(null);
  }

  /**
   * Save a track as a EC TRACK to the Geohub
   *
   * @param track the track to save
   *
   * @returns
   */
  async saveApiTrack(track: WmFeature<LineString>): Promise<WmFeature<LineString> | null> {
    if (track != null) {
      const data = await this._buildFormData(track);

      return this._http
        .post<WmFeature<LineString>>(`${this._environmentSvc.origin}/api/v2/ugc/track/store`, data)
        .pipe(catchError(_ => of(null)))
        .toPromise();
    }

    return Promise.resolve(null);
  }

  /**
   * Synchronize UGC based on the specified type
   * @param type Type of UGC to synchronize ('poi', 'track', or null for both)
   */
  async syncUgc(type: SyncUgcTypes = null): Promise<void> {
    const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();

    if (isLogged) {
      this.syncQueue = this.syncQueue.then(async () => {
        if (isLogged) {
          try {
            if (type === 'poi') {
              await this._syncUgcPois();
            } else if (type === 'track') {
              await this._syncUgcTracks();
            } else {
              // type === null - sync both
              await this._syncUgcPois();
              await this._syncUgcTracks();
            }
          } catch (error) {
            console.error('syncUgc: Error during synchronization:', error);
          }
        } else {
          from(getUgcTracks())
            .pipe(take(1))
            .subscribe(ugcTrackFeatures => {
              this._store.dispatch(updateUgcTracks({ugcTrackFeatures}));
            });
        }
      });
      return this.syncQueue;
    }
  }

  private async _syncUgcPois(): Promise<void> {
    try {
      if (this.isSyncingUgcPoi) {
        return;
      }
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        this.isSyncingUgcPoi = true;
        await this._pushUgcPois();
        await this._fetchUgcPois();
        this.isSyncingUgcPoi = false;
      }
    } catch (error) {
      this.isSyncingUgcPoi = false;
      console.error('syncUgcPois: Error during synchronization:', error);
    }
  }

  private async _syncUgcTracks(): Promise<void> {
    try {
      if (this.isSyncingUgcTrack) {
        return;
      }
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        this.isSyncingUgcTrack = true;
        await this._pushUgcTracks();
        await this._fetchUgcTracks();
        this.isSyncingUgcTrack = false;
      }
    } catch (error) {
      this.isSyncingUgcTrack = false;
      console.error('syncUgcTracks: Error during synchronization:', error);
    }
  }

  async updateApiPoi(poi: WmFeature<Point>): Promise<any> {
    if (poi != null) {
      const data = await this._buildFormData(poi);
      return this._http
        .post(`${this._environmentSvc.origin}/api/v3/ugc/poi/edit`, data)
        .toPromise();
    }
    return Promise.resolve(null);
  }

  async updateApiTrack(track: WmFeature<LineString>): Promise<any> {
    if (track != null) {
      const data = await this._buildFormData(track);
      return this._http
        .post(`${this._environmentSvc.origin}/api/v3/ugc/track/edit`, data)
        .toPromise();
    }
    return Promise.resolve(null);
  }

  private async _buildFormData(feature: WmFeature<LineString | Point>): Promise<FormData> {
    const {properties} = feature;
    const photoFeatures = properties?.media?.filter(p => !p.id) ?? [];
    const data = new FormData();

    // Clean EXIF data from special characters before sending
    const cleanedFeature = this._cleanExifData(feature);
    data.append('feature', JSON.stringify(cleanedFeature));

    for (let [index, photo] of photoFeatures.entries()) {
      if (photo && photo.webPath) {
        await saveImg(photo.webPath);
      }
      if (properties.url) {
        await saveImg(properties.url);
      }
      const blob: ArrayBuffer = (await getImg(photo.webPath)) as ArrayBuffer;
      const image = new Blob([blob]) as Blob;
      data.append(`images[]`, image, `image_${index}.jpg`);
    }
    return data;
  }

  private _cleanExifData(feature: WmFeature<LineString | Point>): WmFeature<LineString | Point> {
    // Create a copy of the feature object
    const cleanedFeature = structuredClone(feature);

    if (cleanedFeature.properties?.media) {
      cleanedFeature.properties.media = cleanedFeature.properties.media.map((media: any) => {
        if (media.exif) {
          // Remove invalid Unicode characters from EXIF data
          const cleanedExif = this._cleanObject(media.exif);
          media.exif = cleanedExif;
        }
        return media;
      });
    }

    return cleanedFeature;
  }

  // Recursive function to clean objects from invalid Unicode characters
  private _cleanObject(obj: any): any {
    if (typeof obj === 'string') {
      // Remove invalid Unicode characters (like \u0000, \u0001, \u0002, etc.)
      return obj.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    } else if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(item => this._cleanObject(item));
      } else {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          cleaned[key] = this._cleanObject(value);
        }
        return cleaned;
      }
    }
    return obj;
  }

  // Function to check if a track has been modified
  private _isFeatureModified(apiFeature: WmFeature<any>, cloudFeature: WmFeature<any>): boolean {
    if (cloudFeature == null) {
      return true;
    }
    // Compare relevant properties to check if the track has been modified
    return (
      JSON.stringify(apiFeature.geometry) !== JSON.stringify(cloudFeature.geometry) ||
      JSON.stringify(apiFeature.properties) !== JSON.stringify(cloudFeature.properties)
    );
  }
}
