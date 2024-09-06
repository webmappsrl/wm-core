import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../conf/conf.token';
@Injectable({
  providedIn: 'root',
})
export class AuthInterceptor implements HttpInterceptor {
  constructor(@Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const idToken = localStorage.getItem('access_token');
    const isGeohubUrl =req.url.includes(this.environment.api);
    if (idToken && isGeohubUrl) {
      // Cloniamo la richiesta per aggiungere le nuove intestazioni
      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${idToken}`,
          'App-id': `${this.environment.geohubId}`,
        },
      });

      return next.handle(clonedReq);
    } else {
      return next.handle(req);
    }
  }
}
