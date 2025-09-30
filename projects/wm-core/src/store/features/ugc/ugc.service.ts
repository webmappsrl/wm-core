import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {DataConsentService} from '@wm-core/services/data-consent.service';
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

import {isLogged} from './../../auth/auth.selectors';
import {updateUgcPois, updateUgcTracks} from './ugc.actions';
import {catchError, map, take, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UgcService {
  private isSyncingUgcPoi = false;
  private isSyncingUgcTrack = false;
  private syncQueue: Promise<void> = Promise.resolve();

  public isLogged$ = this._store.select(isLogged);

  constructor(
    private _http: HttpClient,
    private _store: Store,
    private _environmentSvc: EnvironmentService,
    private _dataConsentSvc: DataConsentService,
  ) {
    // Listen for consent acceptance events to trigger UGC sync
    this._dataConsentSvc.consentAccepted$.subscribe(() => {
      console.log('🔄 Consent accepted event received, triggering UGC synchronization...');
      this.syncUgc()
        .then(() => {
          console.log('✅ UGC synchronization completed after consent acceptance');
        })
        .catch(error => {
          console.error('❌ Error during UGC synchronization after consent acceptance:', error);
        });
    });
  }

  public deleteApiMedia(id: number): Observable<any> {
    return this._http.get(`${this._environmentSvc.origin}/api/v2/ugc/media/delete/${id}`);
  }

  public deleteApiPoi(id: number): Observable<any> {
    return this._http.get(`${this._environmentSvc.origin}/api/v2/ugc/poi/delete/${id}`);
  }

  public deleteApiTrack(id: number): Observable<any> {
    return this._http.get(`${this._environmentSvc.origin}/api/v2/ugc/track/delete/${id}`);
  }

  public deletePoi(poi: WmFeature<Point>): Observable<any> {
    const id = poi.properties.id;
    return this.deleteApiPoi(id).pipe(
      take(1),
      tap(() => this.syncUgc('poi')),
    );
  }

  public deleteTrack(track: WmFeature<LineString>): Observable<any> {
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
      // Check if user has data consent before fetching from API
      const hasConsent = this._dataConsentSvc.getCurrentConsentStatus();
      if (!hasConsent) {
        console.log('🔒 Data consent not given, skipping UGC POI fetch from API');
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
      // console.log('fetchUgcPois: Sincronizzazione eseguita correttamente');
    } catch (error) {
      console.error('fetchUgcPois: Errore durante la sincronizzazione:', error);
    }
  }

  private async _fetchUgcTracks(): Promise<void> {
    try {
      // Check if user has data consent before fetching from API
      const hasConsent = this._dataConsentSvc.getCurrentConsentStatus();
      if (!hasConsent) {
        console.log('🔒 Data consent not given, skipping UGC Track fetch from API');
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
      // console.log('fetchUgcTracks: Sincronizzazione eseguita correttamente');
    } catch (error) {
      console.error('fetchUgcTracks: Errore durante la sincronizzazione:', error);
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

  public getPoi(poiId: string): Observable<WmFeature<Point> | null> {
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

  public loadUgcPois() {
    return from(getUgcPois()).pipe(map(ugcPoiFeatures => updateUgcPois({ugcPoiFeatures})));
  }

  public loadUgcTracks() {
    return from(getUgcTracks()).pipe(map(ugcTrackFeatures => updateUgcTracks({ugcTrackFeatures})));
  }

  private async _pushUgcPois(): Promise<void> {
    try {
      // Check if user has data consent before pushing to API
      const hasConsent = this._dataConsentSvc.getCurrentConsentStatus();
      if (!hasConsent) {
        console.log('🔒 Data consent not given, skipping UGC POI push to API');
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

        // Se il consenso è attivo, sincronizza TUTTI gli UGC non sincronizzati
        console.log(`🔄 Syncing POI ${deviceUgcPoi.properties.uuid} (consent is active)`);

        try {
          const res = await this.saveApiPoi(deviceUgcPoi);
          if (res) {
            await removeDeviceUgcPoi(deviceUgcPoi.properties.uuid);
            synchronizedUgcPois.push(deviceUgcPoi); // Aggiorna la lista dei POI sincronizzati
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
      // Check if user has data consent before pushing to API
      const hasConsent = this._dataConsentSvc.getCurrentConsentStatus();
      if (!hasConsent) {
        console.log('🔒 Data consent not given, skipping UGC Track push to API');
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

        // Se il consenso è attivo, sincronizza TUTTI gli UGC non sincronizzati
        console.log(`🔄 Syncing Track ${deviceUgcTrack.properties.uuid} (consent is active)`);

        try {
          const res = await this.saveApiTrack(deviceUgcTrack);
          if (res) {
            await removeDeviceUgcTrack(deviceUgcTrack.properties.uuid);
            synchronizedUgcTracks.push(deviceUgcTrack); // Aggiorna la lista delle tracce sincronizzate
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
  public async saveApiPoi(poi: WmFeature<Point>): Promise<WmFeature<Point> | null> {
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
  public async saveApiTrack(track: WmFeature<LineString>): Promise<WmFeature<LineString> | null> {
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
   * Sincronizza UGC in base al tipo specificato
   * @param type Tipo di UGC da sincronizzare ('poi', 'track', o null per entrambi)
   */
  public async syncUgc(type: SyncUgcTypes = null): Promise<void> {
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
              // type === null - sincronizza entrambi
              await this._syncUgcPois();
              await this._syncUgcTracks();
            }
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
      console.error('syncUgcPois: Errore durante la sincronizzazione:', error);
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
      console.error('syncUgcTracks: Errore durante la sincronizzazione:', error);
    }
  }

  public async updateApiPoi(poi: WmFeature<Point>): Promise<any> {
    if (poi != null) {
      const data = await this._buildFormData(poi);
      return this._http
        .post(`${this._environmentSvc.origin}/api/v3/ugc/poi/edit`, data)
        .toPromise();
    }
    return Promise.resolve(null);
  }

  public async updateApiTrack(track: WmFeature<LineString>): Promise<any> {
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

    // Pulisce i dati EXIF da caratteri speciali prima di inviare
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
    // Crea una copia dell'oggetto feature
    const cleanedFeature = structuredClone(feature);

    if (cleanedFeature.properties?.media) {
      cleanedFeature.properties.media = cleanedFeature.properties.media.map((media: any) => {
        if (media.exif) {
          // Rimuove caratteri Unicode non validi dai dati EXIF
          const cleanedExif = this._cleanObject(media.exif);
          media.exif = cleanedExif;
        }
        return media;
      });
    }

    return cleanedFeature;
  }

  // Funzione ricorsiva per pulire oggetti da caratteri Unicode non validi
  private _cleanObject(obj: any): any {
    if (typeof obj === 'string') {
      // Rimuove caratteri Unicode non validi (come \u0000, \u0001, \u0002, etc.)
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
