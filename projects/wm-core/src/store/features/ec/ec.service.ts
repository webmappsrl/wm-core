import {HttpClient} from '@angular/common/http';

/* eslint-disable quote-props */
import {Injectable} from '@angular/core';
import {FeatureCollection, LineString} from 'geojson';
import {Observable, of} from 'rxjs';
// @ts-ignore
import {distinctUntilChanged, shareReplay, take} from 'rxjs/operators';
import {Response} from '@wm-types/elastic';
import {Filter, SliderFilter} from '../../../types/config';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {WmFeature} from '@wm-types/feature';
import {EnvironmentService} from '@wm-core/services/environment.service';
@Injectable({
  providedIn: 'root',
})
export class EcService {
  private _queryDic: {[query: string]: any} = {};
  private _shard = 'geohub_app';

  private get _baseUrl(): string {
    const appId = this._environmentSvc.appId;
    return appId
      ? `${this._environmentSvc.elasticApi}/?app=${this._shard}_${appId}`
      : this._environmentSvc.elasticApi;
  }

  /**
   * Creates an instance of ElasticService.
   * @param {HttpClient} _http
   * @memberof ElasticService
   */
  constructor(private _http: HttpClient, private _environmentSvc: EnvironmentService) {}

  public getEcTrack(id: string | number): Observable<WmFeature<LineString>> {
    if (id == null) return of(null);
    if (+id > -1) {
      const url = `${this._environmentSvc.awsApi}/tracks/${id}.json`;
      return this._http.get<WmFeature<LineString>>(url);
    }
  }

  public getPois(): Observable<FeatureCollection> {
    const poisUrl = this._environmentSvc.awsPoisUrl;

    return new Observable<FeatureCollection>(observer => {
      synchronizedApi.getItem(`${poisUrl}`).then((cachedData: string | null) => {
        let parsedData: FeatureCollection | null = null;
        const cachedLastModified = localStorage.getItem(`${poisUrl}-last-modified`);

        // Se ci sono dati in cache, invia immediatamente
        if (cachedData) {
          try {
            parsedData = JSON.parse(cachedData) as FeatureCollection;
            observer.next(parsedData);
          } catch (e) {
            console.warn('Error parsing cached data. Ignoring cached data.', e);
          }
        }

        // Effettua la richiesta HTTP con Last-Modified
        this._http
          .get<FeatureCollection>(poisUrl, {
            observe: 'response',
            headers: cachedLastModified ? {'If-Modified-Since': cachedLastModified} : {},
          })
          .pipe(take(1))
          .subscribe(
            response => {
              const lastModified = response.headers.get('last-modified');

              if (response.status === 200) {
                const pois = response.body;

                if (pois) {
                  // Aggiorna la cache solo con dati nuovi
                  synchronizedApi.setItem(`${poisUrl}`, JSON.stringify(pois));
                  if (lastModified) {
                    localStorage.setItem(`${poisUrl}-last-modified`, lastModified);
                  }
                  observer.next(pois);
                }
              } else if (response.status === 304) {
                console.log('No changes detected for pois, using cached data.');
              }

              observer.complete();
            },
            error => {
              if (!parsedData) {
                observer.error(error); // Errore se non ci sono dati in cache
              } else {
                observer.complete(); // Completa senza errore se esiste la cache
              }
            },
          );
      });
    }).pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      shareReplay(1), // Condivide la risposta tra più osservatori
    );
  }

  /**
   * @description
   * This function is called getQuery and takes two optional parameters,
   * inputTyped and layer. It returns an Observable of type IELASTIC.
   * It builds a query string using the baseUrl and the two optional parameters
   * if they are provided. It then makes a GET request to the built query string and returns
   * the result as an Observable of type IELASTIC.
   *
   * @param {string} [inputTyped]
   * @param {number} [layer]
   * @returns {*}  {Observable<IELASTIC>}
   * @memberof ElasticService
   */
  async getQuery(options: {
    inputTyped?: string;
    layer?: any;
    filterTracks?: Filter[];
    trackIds?: number[];
  }): Promise<Response> {
    await this._environmentSvc.readyPromise;
    let query = this._baseUrl;

    if (options.inputTyped) {
      query += `&query=${options.inputTyped.replace(/ /g, '%20')}`;
    }

    if (options.layer && options.layer.id != null) {
      query += `&layer=${options.layer.id}`;
    }

    if (options.trackIds) {
      query += `&ids=[${options.trackIds.join(',')}]`;
    }

    if (options.filterTracks != null && options.filterTracks.length > 0) {
      const paramString = options.filterTracks.map(filterTrack => {
        if (filterTrack.type === 'slider') {
          const sliderFilter = filterTrack as unknown as SliderFilter;
          return JSON.stringify({
            identifier: sliderFilter.identifier,
            min: sliderFilter.lower,
            max: sliderFilter.upper,
          });
        } else {
          return JSON.stringify({
            identifier: filterTrack.identifier,
            taxonomy: filterTrack.taxonomy,
          });
        }
      });

      query += `&filters=[${paramString.toString()}]`;
    }
    if (this._queryDic[query] == null && query != null) {
      const value = await this._http.request('get', query).toPromise();
      this._queryDic[query] = value;
    }
    return this._queryDic[query];
  }
}

export const hostToGeohubAppId: {[key: string]: number} = {
  'sentieri.caiparma.it': 33,
  'motomappa.motoabbigliamento.it': 53,
  'maps.parcoforestecasentinesi.it': 49,
  'maps.parcopan.org': 63,
  'maps.acquasorgente.cai.it': 58,
  'maps.caipontedera.it': 59,
  'maps.parcapuane.it': 62,
  'fiemaps.it': 29,
  'fiemaps.eu': 29,
};
