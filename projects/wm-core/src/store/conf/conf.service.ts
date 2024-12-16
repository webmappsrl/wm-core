import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {ICONF} from '../../types/config';
import {ENVIRONMENT_CONFIG, EnvironmentConfig} from './conf.token';
import {hostToGeohubAppId} from '../features/ec/ec.service';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {distinctUntilChanged, shareReplay, take} from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class ConfService {
  private _conf: BehaviorSubject<ICONF> = new BehaviorSubject<ICONF>(null as ICONF);
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
    const url = `${this.config.awsApi}/conf/${this._geohubAppId}.json`;

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
                const conf = response.body;
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
    const host = Object.entries(hostToGeohubAppId).find(([key, val]) => val === this._geohubAppId);
    return host ? host[0] : undefined;
  }
}
