import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {Observable} from 'rxjs';
import {IUser} from './auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private _http: HttpClient, private _environmentSvc: EnvironmentService) {}

  login(email: string, password: string, referrer?: string): Observable<IUser> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/login`, {
      email,
      password,
      referrer,
    }) as Observable<IUser>;
  }

  getUser(): Observable<IUser> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/me`, {}) as Observable<IUser>;
  }

  logout(): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/logout`, {}) as Observable<any>;
  }

  signUp(name: string, email: string, password: string, referrer?: string): Observable<IUser> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/signup`, {
      name,
      email,
      password,
      referrer,
    }) as Observable<IUser>;
  }

  delete(): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/delete`, {}) as Observable<any>;
  }
}
