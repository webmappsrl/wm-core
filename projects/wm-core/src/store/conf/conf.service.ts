import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ICONF} from '../../types/config';
import {DeviceService} from '@wm-core/services/device.service';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {handleApiCache} from '@wm-core/utils/api-cache-handler';
@Injectable({
  providedIn: 'root',
})
export class ConfService {
  private _geohubAppId: number = this._environmentSvc.appId;

  public get configUrl(): string {
    return `${this._geohubApiBaseUrl}config`;
  }

  public get geohubAppId(): number {
    return this._geohubAppId;
  }

  public get vectorLayerUrl(): string {
    return `${this._environmentSvc.origin}/api/app/webapp/${this._geohubAppId}/vector_layer`;
  }

  public get vectorStyleUrl(): string {
    return `${this._geohubApiBaseUrl}vector_style`;
  }

  private get _geohubApiBaseUrl(): string {
    return `${this._environmentSvc.origin}/api/app/webmapp/${this._geohubAppId}/`;
  }

  constructor(
    private _http: HttpClient,
    private _deviceSvc: DeviceService,
    private _environmentSvc: EnvironmentService,
  ) {
    this._geohubAppId = this._environmentSvc.appId;
  }

  public getConf(): Observable<ICONF> {
    const url = this._environmentSvc.confUrl;

    return handleApiCache<ICONF>(
      this._http,
      url,
      (data: ICONF) => {
        data.isMobile = this._deviceSvc?.isMobile ?? false;
      },
      this._environmentSvc.shardName === 'carg'
        ? {}
        : (() => {
            const lastModified = localStorage.getItem(`${url}-last-modified`);
            return lastModified ? {'If-Modified-Since': lastModified} : {};
          })(),
    );
  }
}
