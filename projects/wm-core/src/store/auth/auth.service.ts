import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ENVIRONMENT_CONFIG, EnvironmentConfig} from '../conf/conf.token';
import {IUser} from './auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
    private _http: HttpClient,
  ) {}

  login(email: string, password: string, referrer?: string): Observable<IUser> {
    return this._http.post(`${this.environment.api}/api/auth/login`, {
      email,
      password,
      referrer,
    }) as Observable<IUser>;
  }

  getUser(): Observable<IUser> {
    return this._http.post(`${this.environment.api}/api/auth/me`, {}) as Observable<IUser>;
  }

  logout(): Observable<any> {
    return this._http.post(`${this.environment.api}/api/auth/me`, {}) as Observable<any>;
  }

  signUp(name: string, email: string, password: string, referrer?: string): Observable<IUser> {
    return this._http.post(`${this.environment.api}/api/auth/signup`, {
      name,
      email,
      password,
      referrer,
    }) as Observable<IUser>;
  }

  delete(): Observable<any> {
    return this._http.post(`${this.environment.api}/api/auth/delete`, {}) as Observable<any>;
  }
}
