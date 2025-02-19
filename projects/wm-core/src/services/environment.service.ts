import {Injectable} from '@angular/core';
import {Environment, Redirect, Redirects, Shard} from '@wm-types/environment';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private _environment: Environment;
  private _hostname: string;
  private _wmpackagesRegex = /^(\d+)\.([a-zA-Z0-9-]+)\.[^.]+(?:\.[^.]+)?$/;
  private _localHostRegex = /^localhost/;
  private _appId: number;
  private _shardName: string;
  private _origin: string;
  private _elasticApi: string;
  private _graphhopperHost: string;
  private _shard: Shard;
  private _awsApi: string;
  private _awsPoisUrl: string;
  private _awsPbfUrl: string;
  private _confUrl: string;
  private _redirects: Redirects;
  private _redirect: Redirect;

  init(environment: any) {
    this._environment = environment;
    this._hostname = window.location.hostname;

    const wmpackagesRegexMatch = this._hostname.match(this._wmpackagesRegex);
    const _localHostRegex = this._hostname.match(this._localHostRegex);
    if (_localHostRegex) {
      this._appId = environment.appId;
      this._shardName = environment.shardName;
    } else if (wmpackagesRegexMatch && wmpackagesRegexMatch[2] !== 'app') {
      this._appId = +wmpackagesRegexMatch[1];
      this._shardName = wmpackagesRegexMatch[2];
    } else {
      this._redirects = this._environment.redirects;
      const matchedHost = Object.keys(this._redirects ?? {}).find(host =>
        this._hostname.includes(host),
      );
      if (matchedHost) {
        this._redirect = this._redirects[matchedHost];
        this._appId = this._redirect.appId;
        this._shardName = this._redirect.shardName;
      } else {
        this._appId = parseInt(this._hostname.split('.')[0], 10);
        this._shardName = 'geohub';
      }
    }

    this._assignApi();
  }

  private _assignApi() {
    this._shard = this._environment.shards[this._shardName];

    this._elasticApi = this._shard.elasticApi;
    this._graphhopperHost = this._shard.graphhopperHost;
    this._awsApi = this._shard.awsApi;
    this._origin = this._shard.origin;
    if (this._shardName != 'geohub') {
      this._awsPoisUrl = `${this._awsApi}/${this._appId}/pois.geojson`;
      this._confUrl = `${this._awsApi}/${this._appId}/conf.json`;
      this._awsPbfUrl = `${this._awsApi}/${this._appId}/pbf/{z}/{x}/{y}.pbf`;
    } else {
      this._awsPoisUrl = `${this._awsApi}/pois/${this._appId}.geojson`;
      this._confUrl = `${this._awsApi}/conf/${this._appId}.json`;
      this._awsPbfUrl = `https://wmpbf.s3.eu-central-1.amazonaws.com/${this._appId}/{z}/{x}/{y}.pbf`;
    }
  }

  get elasticApi(): string {
    return this._elasticApi;
  }
  get graphhopperHost(): string {
    return this._graphhopperHost;
  }
  get awsApi(): string {
    return this._awsApi;
  }
  get appId(): number {
    return this._appId;
  }
  get awsPoisUrl(): string {
    return this._awsPoisUrl;
  }
  get production(): boolean {
    return this._environment.production;
  }
  get confUrl(): string {
    return this._confUrl;
  }
  get redirect(): Redirect {
    return this._redirect ?? null;
  }
  get redirects(): Redirects {
    return this._redirects;
  }
  get origin(): string {
    return this._origin;
  }
  get pbfUrl(): string {
    return this._awsPbfUrl;
  }
}
