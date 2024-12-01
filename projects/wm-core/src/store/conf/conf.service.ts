import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ICONF} from '../../types/config';
import {ENVIRONMENT_CONFIG, EnvironmentConfig} from './conf.token';
import {hostToGeohubAppId} from '../features/ec/ec.service';
import {synchronizedApi} from '@wm-core/utils/localForage';
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
      const matchedHost = Object.keys(hostToGeohubAppId).find(host => hostname.includes(host));

      if (matchedHost) {
        this._geohubAppId = hostToGeohubAppId[matchedHost];
      } else {
        const newGeohubId = parseInt(hostname.split('.')[0], 10);
        if (!Number.isNaN(newGeohubId)) {
          this._geohubAppId = newGeohubId;
        }
      }
    }
  }

  public getConf(): Observable<ICONF> {
    return new Observable<ICONF>(observer => {
      const url = `${this.config.awsApi}/conf/${this._geohubAppId}.json`;
      synchronizedApi.getItem(url).then((cachedData: unknown) => {
        if (cachedData) {
          const parsedData = JSON.parse(cachedData as string);
          observer.next(parsedData);
          observer.complete();
        }
        this._http.get<ICONF>(url).subscribe(
          conf => {
            synchronizedApi.setItem(url, JSON.stringify(conf));
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

  public getHost(): string | undefined {
    const host = Object.entries(hostToGeohubAppId).find(([key, val]) => val === this._geohubAppId);
    return host ? host[0] : undefined;
  }
}
