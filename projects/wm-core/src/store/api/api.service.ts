import {HttpClient} from '@angular/common/http';

/* eslint-disable quote-props */
import {Inject, Injectable} from '@angular/core';
import {SearchResponse} from 'elasticsearch';
import {FeatureCollection} from 'geojson';
import {from, Observable, of} from 'rxjs';
// @ts-ignore
import {switchMap, tap} from 'rxjs/operators';
import {WmLoadingService} from '../../services/loading.service';
import {Filter, SliderFilter} from '../../types/config';
import {IELASTIC} from '../../types/elastic';
import {EnvironmentConfig, ENVIRONMENT_CONFIG} from '../conf/conf.token';
import {apiLocalForage} from './utils';
// const baseUrl = 'http://localhost:3000/search';
const baseUrl = 'https://elastic-json.webmapp.it/search';
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private _geohubAppId: number = this.environment.geohubId;
  private _hostToGeohubAppId: { [key: string]: number } = {
    'sentieri.caiparma': 33,
    'motomappa.motoabbigliament': 53,
    'maps.parcoforestecasentinesi': 49,
    'maps.parcopan': 63,
    'maps.acquasorgente.cai': 58,
    'maps.caipontedera': 59,
    'maps.parcapuane': 62,
  };
  private _queryDic: {[query: string]: any} = {};

  private get _baseUrl(): string {
    return this._geohubAppId ? `${baseUrl}/?id=${this._geohubAppId}` : baseUrl;
  }

  /**
   * Creates an instance of ElasticService.
   * @param {HttpClient} _http
   * @memberof ElasticService
   */
  constructor(
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
    private _http: HttpClient,
    private _loadingSvc: WmLoadingService,
  ) {
    const hostname: string = window.location.hostname;
    if (hostname.indexOf('localhost') < 0) {
      const matchedHost = Object.keys(this._hostToGeohubAppId).find((host) =>
        hostname.includes(host)
      );
    
      if (matchedHost) {
        this._geohubAppId = this._hostToGeohubAppId[matchedHost];
      } else {
        const newGeohubId = parseInt(hostname.split('.')[0], 10);
        if (!Number.isNaN(newGeohubId)) {
          this._geohubAppId = newGeohubId;
        }
      }
    }
  }

  public getPois(): Observable<FeatureCollection> {
    const poisUrl = `${this.environment.api}/api/v1/app/${this._geohubAppId}/pois.geojson`;
    return from(apiLocalForage.getItem(poisUrl)).pipe(
      switchMap((cachedData: string | null) => {
        if (cachedData != null) {
          const parsedData = JSON.parse(cachedData as string);
          return of(parsedData as FeatureCollection);
        } else {
          this._loadingSvc.show('Loading pois...');
          return this._http.get<FeatureCollection>(poisUrl).pipe(
            tap(pois => {
              apiLocalForage.setItem(poisUrl, JSON.stringify(pois));
            }),
          );
        }
      }),
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
  }): Promise<SearchResponse<IELASTIC>> {
    let query = this._baseUrl;

    if (options.inputTyped) {
      query += `&query=${options.inputTyped.replace(/ /g, '%20')}`;
    }

    if (options.layer && options.layer.id != null) {
      query += `&layer=${options.layer.id}`;
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
    if (this._queryDic[query] == null) {
      const value = await this._http.request('get', query).toPromise();
      this._queryDic[query] = value;
    }
    return this._queryDic[query];
  }
}
