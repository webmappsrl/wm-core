import {EGeojsonGeometryTypes} from '../types/egeojson-geometry-types.enum';
import {HttpClient} from '@angular/common/http';
import {IPhotoItem} from './photo.service';
import {ITrack} from '../types/track';
import {Inject, Injectable} from '@angular/core';
import {WaypointSave} from '../types/waypoint';
import {catchError} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import { APP_ID, ENVIRONMENT_CONFIG, EnvironmentConfig } from 'wm-core/store/conf/conf.token';
import { FeatureCollection } from 'geojson';

@Injectable({
  providedIn: 'root',
})
export class UgcService {
  constructor(
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
    @Inject(APP_ID) public appId: string,
    private _http: HttpClient,
  ) {}

  deletePhoto(id: number): Observable<any> {
    return this._http.get(
      `${this.environment.api}/api/ugc/media/delete/${id}`,
    );
  }

  deleteTrack(id: number): Observable<any> {
    return this._http.get(
      `${this.environment.api}/api/ugc/track/delete/${id}`,
    );
  }

  deleteWaypoint(id: number): Observable<any> {
    return this._http.get(
      `${this.environment.api}/api/ugc/poi/delete/${id}`,
    );
  }

  async getUgcMedias(): Promise<FeatureCollection> {
    return await this._http
      .get<FeatureCollection>(
        `${this.environment.api}/api/ugc/media/index`,
      )
      .toPromise();
  }

  async getUgcPois(): Promise<FeatureCollection> {
    return await this._http
      .get<FeatureCollection>(
        `${this.environment.api}/api/ugc/poi/index`,
      )
      .toPromise();
  }

  async getUgcTracks(): Promise<FeatureCollection> {
    return await this._http
      .get<FeatureCollection>(
        `${this.environment.api}/api/ugc/track/index`,
      )
      .toPromise();
  }

  /**
   * Save a photo as a EC MEDIA to the Geohub
   *
   * @param photo the photo to save
   *
   * @returns
   */
  async savePhoto(photo: IPhotoItem): Promise<any> {
    if (navigator.onLine) {
      const geojson = {
        type: 'Feature',
        geometry: photo.position
          ? {
              type: EGeojsonGeometryTypes.POINT,
              coordinates: [photo.position.longitude, photo.position.latitude],
            }
          : null,
        properties: {
          description: photo.description,
          name: photo.description,
          app_id: this.appId,
          position: photo?.position,
          uuid: photo?.uuid,
        },
      };

      const data = new FormData();

      if (photo.blob) data.append('image', photo.blob, 'image.jpg');
      data.append('geojson', JSON.stringify(geojson));
      console.log('------- ~ GeohubService ~ savePhoto ~ data', data);

      // The content type multipart/form-data is not set because there could be problems
      // Read this https://stackoverflow.com/questions/35722093/send-multipart-form-data-files-with-angular-using-http
      const res = await this._http
        .post(`${this.environment.api}/api/ugc/media/store`, data)
        .pipe(catchError(_ => of(null)))
        .toPromise();
      return res;
    } else {
      return of(photo);
    }
  }

  /**
   * Save a track as a EC TRACK to the Geohub
   *
   * @param track the track to save
   *
   * @returns
   */
  async saveTrack(track: ITrack): Promise<any> {
    if (navigator.onLine) {
      let geometry = null;
      if (track?.geojson?.geometry) {
        geometry = track.geojson.geometry
          ? JSON.parse(JSON.stringify(track.geojson.geometry))
          : null;
        geometry.coordinates = geometry.coordinates.map((x: any) => {
          return [x[0], x[1]];
        });
      }

      const propeties = {...track};
      delete propeties.geojson;
      const data = {
        type: 'Feature',
        geometry: geometry,
        properties: {
          ...{
            name: track.title,
            description: track.description,
            app_id: this.appId,
            image_gallery: track.photoKeys ? track.photoKeys : [],
            uuid: track.uuid,
          },
          ...propeties,
        },
      };
      const res = await this._http
        .post<any>(
          `${this.environment.api}/api/ugc/track/store`,
          data
        )
        .pipe(catchError(_ => null))
        .toPromise();
      return res;
    } else {
      return of(track);
    }
  }

  /**
   * Save a waypoint as a EC POI to the Geohub
   *
   * @param waypoint the waypoint to save
   *
   * @returns
   */
  async saveWaypoint(waypoint: WaypointSave): Promise<any> {
    if (navigator.onLine) {
      const data = {
        type: 'Feature',
        geometry: {
          type: EGeojsonGeometryTypes.POINT,
          coordinates: [waypoint.position.longitude, waypoint.position.latitude],
        },
        properties: {
          ...{
            name: waypoint.title,
            description: waypoint.description,
            app_id: this.appId,
            image_gallery: waypoint.photoKeys ? waypoint.photoKeys : [],
            waypoint_type: waypoint.waypointtype,
            uuid: waypoint.uuid,
          },
          ...waypoint,
        },
      };
      const res = await this._http
        .post<any>(`${this.environment.api}/api/ugc/poi/store`, data)
        .pipe(catchError(_ => null))
        .toPromise();
      return res;
    } else {
      return of(waypoint);
    }
  }
}
