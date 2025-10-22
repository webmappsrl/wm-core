import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {Observable} from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class AuthInterceptor implements HttpInterceptor {
  constructor(private _environmentSvc: EnvironmentService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const idToken = localStorage.getItem('access_token');
    const isOriginUrl = req.url.includes(this._environmentSvc.origin);
    if (isOriginUrl) {
      const setHeaders = {'App-id': `${this._environmentSvc.appId}`};
      if(idToken) {
        setHeaders['Authorization'] = `Bearer ${idToken}`;
      }
      // Cloniamo la richiesta per aggiungere le nuove intestazioni
      const clonedReq = req.clone({
        setHeaders
      });

      return next.handle(clonedReq);
    } else {
      return next.handle(req);
    }
  }
}
