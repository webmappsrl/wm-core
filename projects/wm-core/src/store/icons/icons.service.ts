import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ICONS} from '@wm-types/config';
import {HttpClient} from '@angular/common/http';
import {EnvironmentService} from '@wm-core/services/environment.service';

import {handleApiCache} from '@wm-core/utils/api-cache-handler';

@Injectable({
  providedIn: 'root',
})
export class IconsService {
  constructor(private _http: HttpClient, private _environmentSvc: EnvironmentService) {}

  public getIcons(): Observable<ICONS> {
    const url = this._environmentSvc.awsIconsUrl;

    return handleApiCache<ICONS>(this._http, url);
  }
}
