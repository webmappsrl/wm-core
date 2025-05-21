import {LineString, Point} from 'geojson';
import {Observable, from, of} from 'rxjs';

import {isLogged} from './../../auth/auth.selectors';
import {updateUgcPois, updateUgcTracks} from './ugc.actions';
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
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
import {WmFeature, WmFeatureCollection} from '@wm-types/feature';
import {catchError, map, take, tap} from 'rxjs/operators';
import {EnvironmentService} from '@wm-core/services/environment.service';

@Injectable({
  providedIn: 'root',
})
export class UgcService {
  isLogged$ = this._store.select(isLogged);
  private syncQueue: Promise<void> = Promise.resolve();
  private isSyncingUgcPoi = false;
  private isSyncingUgcTrack = false;
  constructor(
    private _http: HttpClient,
    private _store: Store,
    private _environmentSvc: EnvironmentService,
  ) {}

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

  async getApiPois(): Promise<WmFeatureCollection<Point>> {
    return await this._http
      .get<WmFeatureCollection<Point>>(`${this._environmentSvc.origin}/api/v2/ugc/poi/index`)
      .pipe(catchError(_ => of(null)))
      .toPromise();
  }

  async getApiTracks(): Promise<WmFeatureCollection<LineString>> {
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

  async pushUgcPois(): Promise<void> {
    try {
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

        try {
          const res = await this.saveApiPoi(deviceUgcPoi);
          if (res) {
            await removeDeviceUgcPoi(deviceUgcPoi.properties.uuid);
            synchronizedUgcPois.push(deviceUgcPoi); // Aggiorna la lista dei POI sincronizzati
            //  console.log(`POI with UUID ${deviceUgcPoi.properties.uuid} synchronized and removed.`);
          }
        } catch (poiError) {
          console.error(
            `Error during synchronization of POI ${deviceUgcPoi.properties.uuid}:`,
            poiError,
          );
        }
      }

      // console.log('POI synchronization completed successfully');
    } catch (error) {
      console.error('Error during POI synchronization:', error);
    }
  }

  async pushUgcTracks(): Promise<void> {
    try {
      let deviceUgcTracks = await getDeviceUgcTracks();
      let synchronizedUgcTracks = await getSynchronizedUgcTracks();

      for (let deviceUgcTrack of deviceUgcTracks) {
        const existingTrack = synchronizedUgcTracks.find(
          track => track.properties.uuid === deviceUgcTrack.properties.uuid,
        );

        if (existingTrack) {
          const res = await this.saveApiTrack(deviceUgcTrack);
          // console.log(`Track with UUID ${deviceUgcTrack.properties.uuid} already exists. Skipping save.`,);
          continue;
        }

        try {
          const res = await this.saveApiTrack(deviceUgcTrack);
          if (res) {
            await removeDeviceUgcTrack(deviceUgcTrack.properties.uuid);
            synchronizedUgcTracks.push(deviceUgcTrack); // Aggiorna la lista delle tracce sincronizzate
            // console.log(`Track with UUID ${deviceUgcTrack.properties.uuid} synchronized and removed.`);
          }
        } catch (trackError) {
          console.error(
            `Error during synchronization of track ${deviceUgcTrack.properties.uuid}:`,
            trackError,
          );
        }
      }

      // console.log('Track synchronization completed successfully');
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

  async syncUgc(): Promise<void> {
    const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();

    if (isLogged) {
      this.syncQueue = this.syncQueue.then(async () => {
        if (isLogged) {
          try {
            await this.syncUgcPois();
            await this.syncUgcTracks();
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
      return this.syncQueue;
    }
  }

  async syncUgcPois(): Promise<void> {
    try {
      if (this.isSyncingUgcPoi) {
        return;
      }
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        this.isSyncingUgcPoi = true;
        await this.pushUgcPois();
        await this.fetchUgcPois();
        this.isSyncingUgcPoi = false;
      }
    } catch (error) {
      this.isSyncingUgcPoi = false;
      console.error('syncUgcPois: Errore durante la sincronizzazione:', error);
    }
  }

  async syncUgcTracks(): Promise<void> {
    try {
      if (this.isSyncingUgcTrack) {
        return;
      }
      const isLogged = await from(this.isLogged$.pipe(take(1))).toPromise();
      if (isLogged) {
        this.isSyncingUgcTrack = true;
        await this.pushUgcTracks();
        await this.fetchUgcTracks();
        this.isSyncingUgcTrack = false;
      }
    } catch (error) {
      this.isSyncingUgcTrack = false;
      console.error('syncUgcTracks: Errore durante la sincronizzazione:', error);
    }
  }

  updateApiPoi(poi: WmFeature<Point>): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/v2/ugc/poi/edit`, poi);
  }

  updateApiTrack(track: WmFeature<LineString>): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/v2/ugc/track/edit`, track);
  }

  private async _buildFormData(feature: WmFeature<LineString | Point>): Promise<FormData> {
    const {properties} = feature;
    const photoFeatures = properties?.media ?? [];
    const data = new FormData();
    data.append('feature', JSON.stringify(feature));
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
