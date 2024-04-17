import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import * as localForage from 'localforage';
import {ICONF} from '../../types/config';
import {ENVIRONMENT_CONFIG, EnvironmentConfig} from './conf.token';
@Injectable({
  providedIn: 'root',
})
export class ConfService {
  private _geohubAppId: number = this.config.geohubId;

  public get configUrl(): string {
    return `${this._geohubApiBaseUrl}config`;
  }

  public get geohubAppId(): number {
    return this._geohubAppId;
  }

  public get vectorLayerUrl(): string {
    return `${this.config.api}/api/app/webapp/${this._geohubAppId}/vector_layer`;
  }

  public get vectorStyleUrl(): string {
    return `${this._geohubApiBaseUrl}vector_style`;
  }

  private get _geohubApiBaseUrl(): string {
    return `${this.config.api}/api/app/webmapp/${this._geohubAppId}/`;
  }

  constructor(
    @Inject(ENVIRONMENT_CONFIG) public config: EnvironmentConfig,
    private _http: HttpClient,
  ) {
    const hostname: string = window.location.hostname;
    if (hostname.indexOf('localhost') < 0) {
      if (hostname.indexOf('sentieri.caiparma') > -1) {
        this._geohubAppId = 33;
      } else if (hostname.indexOf('motomappa.motoabbigliament') > -1) {
        this._geohubAppId = 53;
      } else if (hostname.indexOf('maps.parcoforestecasentinesi') > -1) {
        this._geohubAppId = 49;
      } else {
        const newGeohubId = parseInt(hostname.split('.')[0], 10);
        if (!Number.isNaN(newGeohubId)) {
          this._geohubAppId = newGeohubId;
        }
      }
    }
    localForage.config({
      name: 'wm',
      storeName: 'wm-core-store',
    });
  }

  public getConf(): Observable<ICONF> {
    return new Observable<ICONF>(observer => {
      const url = `${this._geohubApiBaseUrl}config.json`;
      localForage.getItem(url).then((cachedData: unknown) => {
        if (cachedData) {
          const parsedData = JSON.parse(cachedData as string);
          observer.next(parsedData);
          observer.complete();
        }
        this._http.get<ICONF>(url).subscribe(
          conf => {
            localForage.setItem(url, JSON.stringify(conf));
            observer.next(conf);
            observer.complete();
          },
          error => {
            observer.error(error);
          },
        );
      });
    });
  }
}
