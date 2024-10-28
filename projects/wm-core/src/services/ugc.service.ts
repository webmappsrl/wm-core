import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {catchError, take, tap} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import {APP_ID, ENVIRONMENT_CONFIG, EnvironmentConfig} from 'wm-core/store/conf/conf.token';
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
  removeCloudUgcMedia,
  removeDeviceUgcMedia,
  removeDeviceUgcTrack,
  saveUgcMedia,
  saveUgcPoi,
  saveUgcTrack,
} from 'wm-core/utils/localForage';
import {Media, responseDeleteMedia, WmFeature, WmFeatureCollection} from '@wm-types/feature';

@Injectable({
  providedIn: 'root',
})
export class UgcService {
  constructor(
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
    @Inject(APP_ID) public appId: string,
    private _http: HttpClient,
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
        console.log(res);
        if (res.success != null) {
          removeCloudUgcMedia(media.properties.id);
          this.syncUgcFromCloud();
        }
      }),
    );
  }

  deletePoi(poi: WmFeature<Point>): Observable<any> {
    const id = poi.properties.id;
    return this.deleteApiPoi(id).pipe(
      take(1),
      tap(() => this.syncUgcFromCloud()),
    );
  }

  deleteTrack(track: WmFeature<LineString>): Observable<any> {
    if (track.properties.id) {
      return this.deleteApiTrack(track.properties.id).pipe(
        take(1),
        tap(() => this.syncUgcFromCloud()),
      );
    }
    return of({error: 'Track id not found'});
  }

  async getApiMedias(): Promise<WmFeatureCollection<Media>> {
    return await this._http
      .get<WmFeatureCollection<Media>>(`${this.environment.api}/api/ugc/media/index`)
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
          console.error('Errore durante il recupero del POI:', error);
          observer.next(null);
          observer.complete();
        });
    });
  }

  /**
   * Save a photo as a EC MEDIA to the Geohub
   *
   * @param photo the photo to save
   *
   * @returns
   */
  async saveApiMedia(media: WmFeature<Media>): Promise<WmFeature<Media>> {
    if (media != null) {
      const {properties} = media;
      if (properties.blob) properties.append('image', properties.blob, 'image.jpg');
      return await this._http
        .post(`${this.environment.api}/api/ugc/media/store`, media)
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
      return this._http
        .post<WmFeature<Point>>(`${this.environment.api}/api/ugc/poi/store`, poi)
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
      return this._http
        .post<any>(`${this.environment.api}/api/ugc/track/store`, track)
        .pipe(catchError(_ => null))
        .toPromise();
    }

    return Promise.resolve(null);
  }

  async savePhotos(photos: WmFeature<Point>[], skipUpload = false): Promise<void> {
    for (let photo of photos) {
      saveUgcMedia(photo as any);
    }
  }

  saveTrack(track: WmFeature<LineString>): Observable<any> {
    if (track.properties.uuid) {
      return this.saveTrack(track).pipe(
        take(1),
        tap(() => this.syncUgcFromCloud()),
      );
    }
    return of({error: 'Track id not found'});
  }

  async syncUgcFromCloud(): Promise<void> {
    this.syncUgcTracksFromCloud();
    this.syncUgcPoisFromCloud();
    this.syncUgcMediasFromCloud();
  }

  async syncUgcMediasFromCloud(): Promise<void> {
    try {
      const apiUgcMedias = await this.getApiMedias();
      const cloudUgcMedias = await getSynchronizedUgcMedias();

      // Sincronizza le tracce API con quelle salvate localmente in cloudUgcTrack
      for (let apiUgcMedia of apiUgcMedias.features) {
        const cloudMedia = cloudUgcMedias.find(
          media => media.properties.uuid === media.properties.uuid,
        );

        // Se la traccia API non esiste in cloudUgcTrack o è stata modificata, aggiorniamo cloudUgcTrack
        if (!cloudMedia || this._isFeatureModified(apiUgcMedia, cloudMedia)) {
          await saveUgcMedia(apiUgcMedia); // Salva la traccia aggiornata in cloudUgcTrack
          console.log(`Media sincronizzata dal cloud con uuid: ${apiUgcMedia.properties.uuid}`);
        }
      }

      console.log('Sincronizzazione dei medias dal cloud eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione dei medias dal cloud:', error);
    }
  }

  async syncUgcMediasToCloud(): Promise<void> {
    try {
      let deviceUgcMedias = await getDeviceUgcMedias();
      for (let deviceUgcMedia of deviceUgcMedias) {
        try {
          const res = await this.saveApiMedia(deviceUgcMedia);
          if (res) {
            await removeDeviceUgcMedia(deviceUgcMedia.properties.uuid);
            console.log(
              `Media con uuid ${deviceUgcMedia.properties.uuid} sincronizzata e rimossa.`,
            );
          }
        } catch (trackError) {
          console.error(
            `Errore durante la sincronizzazione del media ${deviceUgcMedia.properties.uuid}:`,
            trackError,
          );
        }
      }

      console.log('Sincronizzazione dei pois eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione dei poi:', error);
    }
  }

  async syncUgcPoisFromCloud(): Promise<void> {
    try {
      const apiUgcPois = await this.getApiPois();
      const cloudUgcPois = await getSynchronizedUgcPois();

      // Sincronizza le tracce API con quelle salvate localmente in cloudUgcTrack
      for (let apiUgcPoi of apiUgcPois.features) {
        const cloudPoi = cloudUgcPois.find(poi => poi.properties.uuid === poi.properties.uuid);

        // Se la traccia API non esiste in cloudUgcTrack o è stata modificata, aggiorniamo cloudUgcTrack
        if (!cloudPoi || this._isFeatureModified(apiUgcPoi, cloudPoi)) {
          await saveUgcPoi(apiUgcPoi); // Salva la traccia aggiornata in cloudUgcTrack
          console.log(`Traccia sincronizzata dal cloud con uuid: ${apiUgcPoi.properties.uuid}`);
        }
      }

      console.log('Sincronizzazione delle tracce dal cloud eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione delle tracce dal cloud:', error);
    }
  }

  async syncUgcPoisToCloud(): Promise<void> {
    try {
      let deviceUgcPois = await getDeviceUgcPois();
      for (let deviceUgcPoi of deviceUgcPois) {
        try {
          const res = await this.saveApiPoi(deviceUgcPoi);
          if (res) {
            await removeDeviceUgcTrack(deviceUgcPoi.properties.uuid);
            console.log(`Poi con uuid ${deviceUgcPoi.properties.uuid} sincronizzata e rimossa.`);
          }
        } catch (trackError) {
          console.error(
            `Errore durante la sincronizzazione del pou ${deviceUgcPoi.properties.uuid}:`,
            trackError,
          );
        }
      }

      console.log('Sincronizzazione dei pois eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione dei poi:', error);
    }
  }

  async syncUgcToCloud(): Promise<void> {
    this.syncUgcMediasToCloud();
    this.syncUgcTracksToCloud();
    this.syncUgcPoisToCloud();
  }

  async syncUgcTracksFromCloud(): Promise<void> {
    try {
      const apiUgcTracks = await this.getApiTracks();
      const cloudUgcTracks = await getSynchronizedUgcTracks();

      // Sincronizza le tracce API con quelle salvate localmente in cloudUgcTrack
      for (let apiTrack of apiUgcTracks.features) {
        const cloudTrack = cloudUgcTracks.find(
          track => track.properties.uuid === apiTrack.properties.uuid,
        );

        // Se la traccia API non esiste in cloudUgcTrack o è stata modificata, aggiorniamo cloudUgcTrack
        if (!cloudTrack || this._isFeatureModified(apiTrack, cloudTrack)) {
          await saveUgcTrack(apiTrack); // Salva la traccia aggiornata in cloudUgcTrack
          console.log(`Traccia sincronizzata dal cloud con uuid: ${apiTrack.properties.uuid}`);
        }
      }

      console.log('Sincronizzazione delle tracce dal cloud eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione delle tracce dal cloud:', error);
    }
  }

  async syncUgcTracksToCloud(): Promise<void> {
    try {
      let deviceUgcTracks = await getDeviceUgcTracks();
      for (let deviceUgcTrack of deviceUgcTracks) {
        try {
          const res = await this.saveTrack(deviceUgcTrack);
          if (res) {
            await removeDeviceUgcTrack(deviceUgcTrack.properties.uuid);
            console.log(
              `Traccia con uuid ${deviceUgcTrack.properties.uuid} sincronizzata e rimossa.`,
            );
          }
        } catch (trackError) {
          console.error(
            `Errore durante la sincronizzazione della traccia ${deviceUgcTrack.properties.uuid}:`,
            trackError,
          );
        }
      }

      console.log('Sincronizzazione delle tracce eseguita correttamente');
    } catch (error) {
      console.error('Errore durante la sincronizzazione delle tracce:', error);
    }
  }

  // Funzione per verificare se una traccia è stata modificata
  private _isFeatureModified(apiFeature: WmFeature<any>, cloudFeature: WmFeature<any>): boolean {
    // Confronta proprietà rilevanti per verificare se la traccia è stata modificata
    return (
      JSON.stringify(apiFeature.geometry) !== JSON.stringify(cloudFeature.geometry) ||
      JSON.stringify(apiFeature.properties) !== JSON.stringify(cloudFeature.properties)
    );
  }
}
