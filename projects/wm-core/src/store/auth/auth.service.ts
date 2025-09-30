import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {Observable} from 'rxjs';
import {IUser} from './auth.model';
import {Store} from '@ngrx/store';
import {IAPP} from '@wm-core/types/config';
import {confAPP} from '@wm-core/store/conf/conf.selector';
import {switchMap, take} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  confAPP$: Observable<IAPP> = this._store.select(confAPP);
  constructor(
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
    private _store: Store,
  ) {}

  login(email: string, password: string, referrer?: string): Observable<IUser> {
    return this.confAPP$.pipe(
      take(1),
      switchMap(confApp => {
        const sku = confApp.sku;
        const appId = confApp.id ?? confApp.geohubId;
        email = email?.toLowerCase();

        return this._http.post(`${this._environmentSvc.origin}/api/auth/login`, {
          email,
          password,
          sku,
          appId,
        }) as Observable<IUser>;
      }),
    );
  }

  getUser(): Observable<IUser> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/me`, {}) as Observable<IUser>;
  }

  logout(): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/logout`, {}) as Observable<any>;
  }

  signUp(name: string, email: string, password: string): Observable<IUser> {
    return this.confAPP$.pipe(
      take(1),
      switchMap(confApp => {
        const sku = confApp.sku;
        const appId = confApp.id ?? confApp.geohubId;
        email = email?.toLowerCase();

        return this._http.post(`${this._environmentSvc.origin}/api/auth/signup`, {
          name,
          email,
          password,
          sku,
          appId,
        }) as Observable<IUser>;
      }),
    );
  }

  delete(): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/delete`, {}) as Observable<any>;
  }

  updateDataConsent(consent: boolean, appId: string): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/edit-user`, {
      consent,
      app_id: appId,
    }) as Observable<any>;
  }

  getDataConsent(appId: string): Observable<any> {
    return this._http.get(
      `${this._environmentSvc.origin}/api/auth/edit-user?app_id=${appId}`,
    ) as Observable<any>;
  }

  /**
   * Update user data (complete user editing)
   * @param userData Partial user data to update
   * @returns Observable with updated user data
   */
  updateUser(userData: any): Observable<IUser> {
    return this._http.post(
      `${this._environmentSvc.origin}/api/auth/edit-user`,
      userData,
    ) as Observable<IUser>;
  }

  /**
   * Get complete user data
   * @param appId Optional app ID to include data consent info
   * @returns Observable with user data
   */
  getUserData(appId?: string): Observable<IUser> {
    const url = appId
      ? `${this._environmentSvc.origin}/api/auth/edit-user?app_id=${appId}`
      : `${this._environmentSvc.origin}/api/auth/edit-user`;
    return this._http.get(url) as Observable<IUser>;
  }
}
