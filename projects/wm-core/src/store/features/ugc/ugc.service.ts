import {isLogged} from './../../auth/auth.selectors';
import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {catchError, filter, map, take, tap} from 'rxjs/operators';
import {from, Observable, of} from 'rxjs';
import {APP_ID, ENVIRONMENT_CONFIG, EnvironmentConfig} from '@wm-core/store/conf/conf.token';
import {LineString, Point} from 'geojson';
import {
  getSynchronizedUgcMedias,
  getSynchronizedUgcPoi,
  getSynchronizedUgcPois,
  getSynchronizedUgcTracks,
  getDeviceUgcMedias,
  getDeviceUgcPoi,
  getDeviceUgcPois,
  getDeviceUgcTracks,
  removeSynchronizedUgcMedia,
  removeDeviceUgcMedia,
  removeDeviceUgcTrack,
  saveUgcMedia,
  saveUgcPoi,
  saveUgcTrack,
  getImg,
  removeDeviceUgcPoi,
  getUgcTracks,
  getUgcPois,
  saveImg,
} from '@wm-core/utils/localForage';
import {
  Media,
  MediaProperties,
  responseDeleteMedia,
  WmFeature,
  WmFeatureCollection,
} from '@wm-types/feature';
import {Store} from '@ngrx/store';
import {syncUgc, syncUgcSuccess, updateUgcPois, updateUgcTracks} from './ugc.actions';

@Injectable({
  providedIn: 'root',
})
export class UgcService {
  isLogged$ = this._store.select(isLogged);

  constructor(
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
    @Inject(APP_ID) public appId: string,
    private _http: HttpClient,
    private _store: Store,
  ) {}

  deleteApiMedia(id: number): Observable<any> {
    return this._http.get(`${this.environment.api}/api/ugc/media/delete/${id}`);
  }

  deleteApiPoi(id: number): Observable<any> {
    return this._http.get(`${this.environment.api}/api/ugc/poi/delete/${id}`);
  }

  deleteApiTrack(id: number): Observable<any> {
    return this._http.get(`${this.environment.api}/api/ugc/track/delete/${id}`);
  }

  deleteMedia(media: WmFeature<Media>): Observable<any> {
    const id = media.properties.id;
    return this.deleteApiMedia(id).pipe(
      take(1),
      tap((res: responseDeleteMedia) => {
        // console.log(res);
        if (res.success != null) {
          removeSynchronizedUgcMedia(media.properties.id);
          this.syncUgc();
        }
      }),
    );
  }

  deletePoi(poi: WmFeature<Point>): Observable<any> {
    const id = poi.properties.id;
    return this.deleteApiPoi(id).pipe(
      take(1),
      tap(() => this.syncUgc()),
    );
  }

  deleteTrack(track: WmFeature<LineString>): Observable<any> {
    if (track.properties.id) {
      return this.deleteApiTrack(track.properties.id).pipe(
        take(1),
        tap(() => this.syncUgc()),
      );
    }
    if (track.properties.uuid) {
      return of(removeDeviceUgcTrack(track.properties.uuid));
    }
    return of({error: 'Track id not found'});
  }

  async fetchUgcMedias(): Promise<void> {
    try {
      const apiUgcMedias = await this.getApiMedias();
      if (apiUgcMedias == null) {
        return;
      }
      const cloudUgcMedias = await getSynchronizedUgcMedias();

      for (let apiUgcMedia of apiUgcMedias.features) {
        const cloudMedia = cloudUgcMedias.find(
          media => media.properties.uuid === apiUgcMedia.properties.uuid,
        );
        if (!cloudMedia || this._isFeatureModified(apiUgcMedia, cloudMedia)) {
          // console.log(`fetchUgcMedias sync: ${apiUgcMedia.properties.id} syncronized`);
          await saveUgcMedia(apiUgcMedia);
        } else {
          // console.log(`fetchUgcMedias sync: ${apiUgcMedia.properties.id}`);
        }
      }
      // console.log('fetchUgcMedias: Sincronizzazione eseguita correttamente');
    } catch (error) {
      console.error('fetchUgcMedias: Errore durante la sincronizzazione:', error);
    }
  }

  async fetchUgcPois(): Promise<void> {
    try {
      const apiUgcPois = await this.getApiPois();
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
      // console.log('fetchUgcPois: Sincronizzazione eseguita correttamente');
    } catch (error) {
      console.error('fetchUgcPois: Errore durante la sincronizzazione:', error);
    }
  }

  async fetchUgcTracks(): Promise<void> {
    try {
      const apiUgcTracks = await this.getApiTracks();
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
      // console.log('fetchUgcTracks: Sincronizzazione eseguita correttamente');
    } catch (error) {
      console.error('fetchUgcTracks: Errore durante la sincronizzazione:', error);
    }
  }

  async getApiMedias(): Promise<WmFeatureCollection<Media, MediaProperties>> {
    return await this._http
      .get<WmFeatureCollection<Media, MediaProperties>>(
        `${this.environment.api}/api/ugc/media/index/v2`,
      )
      .pipe(catchError(_ => of(null)))
      .toPromise();
  }

  async getApiPois(): Promise<WmFeatureCollection<Point>> {
    return await this._http
      .get<WmFeatureCollection<Point>>(`${this.environment.api}/api/ugc/poi/index/v2`)
      .pipe(catchError(_ => of(null)))
      .toPromise();
  }

  async getApiTracks(): Promise<WmFeatureCollection<LineString>> {
    return await this._http
      .get<WmFeatureCollection<LineString>>(`${this.environment.api}/api/ugc/track/index/v2`)
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

  async pushUgcMedias(): Promise<void> {
    try {
      let deviceUgcMedias = await getDeviceUgcMedias();
      for (let deviceUgcMedia of deviceUgcMedias) {
        try {
          const res = await this.saveApiMedia(deviceUgcMedia);
          if (res) {
            await removeDeviceUgcMedia(deviceUgcMedia.properties.uuid);
            // console.log(`pushUgcMedias: Media con uuid ${deviceUgcMedia.properties.uuid} sincronizzata e rimossa.` );
          }
        } catch (trackError) {
          console.error(
            `Errore durante la sincronizzazione del media ${deviceUgcMedia.properties.uuid}:`,
            trackError,
          );
        }
      }

      // console.log('Sincronizzazione dei pois eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione dei poi:', error);
    }
  }

  async pushUgcPois(): Promise<void> {
    try {
      let deviceUgcPois = await getDeviceUgcPois();
      for (let deviceUgcPoi of deviceUgcPois) {
        try {
          const res = await this.saveApiPoi(deviceUgcPoi);
          if (res) {
            await removeDeviceUgcPoi(deviceUgcPoi.properties.uuid);
            // console.log(`Poi con uuid ${deviceUgcPoi.properties.uuid} sincronizzata e rimossa.`);
          }
        } catch (trackError) {
          console.error(
            `Errore durante la sincronizzazione del pou ${deviceUgcPoi.properties.uuid}:`,
            trackError,
          );
        }
      }

      // console.log('Sincronizzazione dei pois eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione dei poi:', error);
    }
  }

  async pushUgcTracks(): Promise<void> {
    try {
      let deviceUgcTracks = await getDeviceUgcTracks();
      for (let deviceUgcTrack of deviceUgcTracks) {
        try {
          const res = await this.saveApiTrack(deviceUgcTrack);
          if (res) {
            await removeDeviceUgcTrack(deviceUgcTrack.properties.uuid);
            // console.log( `Traccia con uuid ${deviceUgcTrack.properties.uuid} sincronizzata e rimossa.`);
          }
        } catch (trackError) {
          console.error(
            `Errore durante la sincronizzazione della traccia ${deviceUgcTrack.properties.uuid}:`,
            trackError,
          );
        }
      }

      // console.log('Sincronizzazione delle tracce eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione delle tracce:', error);
    }
  }

  /**
   * Save a photo as a EC MEDIA to the Geohub
   *
   * @param photo the photo to save
   *
   * @returns
   */
  async saveApiMedia(media: WmFeature<Media>): Promise<WmFeature<Media, MediaProperties>> {
    if (media != null) {
      const {properties} = media;
      const photo = properties.photo;
      const data = new FormData();
      data.append('feature', JSON.stringify(media));

      if (photo.webPath) {
        const blob: ArrayBuffer = (await getImg(photo.webPath)) as ArrayBuffer;
        data.append('image', new Blob([blob]) as Blob, 'image.jpg');
      }
      return await this._http
        .post(`${this.environment.api}/api/ugc/media/store/v2`, data)
        .pipe(catchError(_ => of(null)))
        .toPromise();
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
        .post<WmFeature<Point>>(`${this.environment.api}/api/ugc/poi/store/v2`, data)
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
        .post<WmFeature<LineString>>(`${this.environment.api}/api/ugc/track/store/v2`, data)
        .pipe(catchError(_ => of(null)))
        .toPromise();
    }

    return Promise.resolve(null);
  }

  async saveMedias(photos: WmFeature<Media, MediaProperties>[]): Promise<void> {
    for (let photo of photos) {
      await saveUgcMedia(photo);
    }
    this.syncUgc();
  }

  savePoi(poi: WmFeature<Point>): Observable<any> {
    if (poi.properties.uuid) {
      return of(saveUgcPoi(poi)).pipe(
        take(1),
        tap(() => this.syncUgc()),
      );
    }
    return of({error: 'savePoi: id not found'});
  }

  saveTrack(track: WmFeature<LineString>): Observable<any> {
    if (track.properties.uuid) {
      return of(saveUgcTrack(track)).pipe(
        take(1),
        tap(() => this.syncUgc()),
      );
    }
    return of({error: 'saveTrack: id not found'});
  }

  async syncUgc(): Promise<void> {
    this.isLogged$.pipe(take(1)).subscribe(async isLogged => {
      if (isLogged) {
        try {
          await this.syncUgcPois();
          await this.syncUgcTracks();
          await this.syncUgcMedias();
        } catch (error) {
          console.error('syncUgc: Errore durante la sincronizzazione:', error);
        }
      } else {
        from(getUgcTracks())
          .pipe(take(1))
          .subscribe(ugcTrackFeatures => {
            this._store.dispatch(updateUgcTracks({ugcTrackFeatures}));
          });
      }
    });
  }

  async syncUgcMedias(): Promise<void> {
    try {
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        await this.fetchUgcMedias();
      }
    } catch (error) {
      console.error('syncUgcMedias: Errore durante la sincronizzazione:', error);
    }
  }

  async syncUgcPois(): Promise<void> {
    try {
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        await this.pushUgcPois();
        await this.fetchUgcPois();
      }
    } catch (error) {
      console.error('syncUgcPois: Errore durante la sincronizzazione:', error);
    }
  }

  async syncUgcTracks(): Promise<void> {
    try {
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        await this.pushUgcTracks();
        await this.fetchUgcTracks();
      }
    } catch (error) {
      console.error('syncUgcTracks: Errore durante la sincronizzazione:', error);
    }
  }

  updateApiPoi(poi: WmFeature<Point>): Observable<any> {
    return this._http.post(`${this.environment.api}/api/ugc/poi/edit`, poi);
  }

  updateApiTrack(track: WmFeature<LineString>): Observable<any> {
    return this._http.post(`${this.environment.api}/api/ugc/track/edit`, track);
  }

  private async _buildFormData(feature: WmFeature<LineString | Point>): Promise<FormData> {
    const {properties} = feature;
    const photoFeatures = properties.photos;
    const data = new FormData();
    data.append('feature', JSON.stringify(feature));
    for (let [index, photoFeature] of photoFeatures.entries()) {
      const {properties} = photoFeature;
      const {photo} = properties;
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

  // Funzione per verificare se una traccia è stata modificata
  private _isFeatureModified(apiFeature: WmFeature<any>, cloudFeature: WmFeature<any>): boolean {
    if (cloudFeature == null) {
      return true;
    }
    // Confronta proprietà rilevanti per verificare se la traccia è stata modificata
    return (
      JSON.stringify(apiFeature.geometry) !== JSON.stringify(cloudFeature.geometry) ||
      JSON.stringify(apiFeature.properties) !== JSON.stringify(cloudFeature.properties)
    );
  }
}
