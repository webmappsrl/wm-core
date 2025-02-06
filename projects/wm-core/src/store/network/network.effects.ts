import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {
  startNetworkMonitoring,
  startNetworkMonitoringFail,
  startNetworkMonitoringSuccess,
} from './network.actions';
import {NetworkService} from './network.service';

@Injectable({
  providedIn: 'root',
})
export class NetworkEffects {
  startNetworkMonitoring$ = createEffect(() =>
    this._actions$.pipe(
      ofType(startNetworkMonitoring),
      switchMap(action => this._networkSvc.online$),
      map(online => startNetworkMonitoringSuccess({online})),
      catchError(() => of(startNetworkMonitoringFail())),
    ),
  );

  constructor(private _networkSvc: NetworkService, private _actions$: Actions) {}
}
