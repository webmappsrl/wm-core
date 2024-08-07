import { HttpClient } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import {Observable} from 'rxjs';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from "../conf/conf.token";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
    private _http: HttpClient
  ) {}

  login(email: string, password: string): Observable<IGeohubApiLogin>{
    return this._http.post(
      `${this.environment.api}/api/auth/login`,
      {
        email,
        password,
      },
    ) as Observable<IGeohubApiLogin>;
  }
}
