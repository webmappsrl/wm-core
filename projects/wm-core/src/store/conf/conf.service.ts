import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {ICONF} from '../../types/config';
import {ENVIRONMENT_CONFIG, EnvironmentConfig} from './conf.token';
import {hostToGeohubAppId} from '../features/ec/ec.service';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {distinctUntilChanged} from 'rxjs/operators';
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
      synchronizedApi.getItem(url).then((cachedData: string | null) => {
        let parsedData: ICONF | null = null;

        // Verifica se i dati in cache sono validi
        if (cachedData) {
          try {
            parsedData = JSON.parse(cachedData) as ICONF;

            // Controlla la validità del dato (opzionale, se necessario)
            if (!parsedData) {
              console.warn('Invalid cache format. Ignoring cached data.');
              parsedData = null;
            }
          } catch (e) {
            console.warn('Error parsing cached data. Ignoring cached data.', e);
            parsedData = null;
          }

          // Invia i dati dalla cache se validi
          if (parsedData) {
            observer.next(parsedData);
          }
        }

        // Scarica i dati aggiornati
        this._http.get<ICONF>(url).subscribe(
          conf => {
            if (!cachedData || cachedData !== JSON.stringify(conf)) {
              synchronizedApi.setItem(url, JSON.stringify(conf)); // Aggiorna la cache
              observer.next(conf); // Invia i dati aggiornati
            } else {
              console.log('conf Cache is up-to-date. No changes detected.');
            }
            observer.complete();
          },
          error => {
            if (!parsedData) {
              observer.error(error); // Errore solo se non ci sono dati cache
            } else {
              observer.complete();
            }
          },
        );
      });
    }).pipe(distinctUntilChanged((a, b) => JSON.stringify(a) == JSON.stringify(b)));
  }

  public getHost(): string | undefined {
    const host = Object.entries(hostToGeohubAppId).find(([key, val]) => val === this._geohubAppId);
    return host ? host[0] : undefined;
  }
}
