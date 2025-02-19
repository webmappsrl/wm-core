import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {ICONF} from '../../types/config';
import {hostToGeohubAppId} from '../features/ec/ec.service';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {distinctUntilChanged, shareReplay, take} from 'rxjs/operators';
import {DeviceService} from '@wm-core/services/device.service';
import {EnvironmentService} from '@wm-core/services/environment.service';
@Injectable({
  providedIn: 'root',
})
export class ConfService {
  private _conf: BehaviorSubject<ICONF> = new BehaviorSubject<ICONF>(null as ICONF);
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

    return new Observable<ICONF>(observer => {
      synchronizedApi.getItem(`${url}`).then((cachedData: string | null) => {
        let parsedData: ICONF | null = null;
        const cachedLastModified = localStorage.getItem(`${url}-last-modified`);

        // Verifica se c'è un dato in cache
        if (cachedData) {
          try {
            parsedData = JSON.parse(cachedData) as ICONF;
            observer.next(parsedData); // Invio immediato dei dati in cache
          } catch (e) {
            console.warn('Error parsing cached data. Ignoring cache.', e);
          }
        }

        // Effettua la richiesta HTTP con Last-Modified
        this._http
          .get<ICONF>(url, {
            observe: 'response',
            headers: cachedLastModified ? {'If-Modified-Since': cachedLastModified} : {},
          })
          .pipe(take(1))
          .subscribe(
            response => {
              const lastModified = response.headers.get('last-modified');

              if (response.status === 200) {
                const conf = {...response.body, isMobile: this._deviceSvc?.isMobile ?? false};
                if (conf) {
                  // Aggiorna cache solo se necessario
                  synchronizedApi.setItem(`${url}`, JSON.stringify(conf));
                  if (lastModified) {
                    localStorage.setItem(`${url}-last-modified`, lastModified);
                  }
                  observer.next(conf);
                }
              } else if (response.status === 304) {
                console.log('No changes detected, using cached data.');
              }
              observer.complete();
            },
            error => {
              if (!parsedData) {
                observer.error(error); // Nessun dato in cache, errore critico
              } else {
                observer.complete();
              }
            },
          );
      });
    }).pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      shareReplay(1), // Riduce chiamate duplicate per più osservatori
    );
  }

  public getHost(): string | undefined {
    const host = Object.entries(this._environmentSvc.redirectHost).find(
      ([key, val]) => val === this._geohubAppId,
    );
    return host ? host[0] : undefined;
  }
}
