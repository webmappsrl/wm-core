import {Inject, Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of, from} from 'rxjs';
import {catchError, filter, map, switchMap, withLatestFrom, take} from 'rxjs/operators';
import {
  loadConf,
  loadConfFail,
  loadConfSuccess,
  updateMapWithUgc,
  checkAppVersion,
} from './conf.actions';
import {ConfService} from './conf.service';
import {select, Store} from '@ngrx/store';
import {activableUgc} from '@wm-core/store/features/ugc/ugc.selector';
import {confMAP, isConfLoaded} from './conf.selector';
import {isConfLoaded, confReleaseUpdate} from './conf.selector';
import {isConfLoaded, confAPP} from './conf.selector';
import {currentEcLayerId} from '../features/ec/ec.actions';
import {IHOME, ILAYER, ILAYERBOX, IAPP} from '@wm-core/types/config';
import {setLayer} from '../user-activity/user-activity.action';
import {DeviceService} from '@wm-core/services/device.service';
import {APP_VERSION} from './conf.token';
@Injectable({
  providedIn: 'root',
})
export class ConfEffects {
  loadConf$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadConf),
      switchMap(() =>
        this._configSVC.getConf().pipe(
          filter(conf => conf != null),
          map(conf => {
            conf = {...conf, isMobile: this._deviceService.isMobile};
            return loadConfSuccess({conf});
          }),
          catchError((_: any) => of(loadConfFail())),
        ),
      ),
    ),
  );
  updateLayer$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentEcLayerId),
      switchMap(action =>
        this._store.select(confMAP).pipe(
          filter(map => map != null && map.layers != null && map.layers.length > 0),
          take(1),
          map(map => [action, map] as const),
        ),
      ),
      switchMap(([action, map]) => {
        const id = action.currentEcLayerId;
        const layer: ILAYER = map.layers.find(layer => +layer.id === +id) ?? null;

        return of(setLayer({layer})).pipe(catchError(() => of(setLayer({layer: null}))));
      }),
    ),
  );
  updateMapWithUgc$ = createEffect(() =>
    this._store.pipe(
      select(activableUgc), // Osserva i cambiamenti del selettore
      withLatestFrom(this._store.select(isConfLoaded)),
      filter(([_, isLoaded]) => isLoaded),
      map(([activableUgc]) => updateMapWithUgc({activableUgc})), // Dispatch dell'azione con il valore del selettore
    ),
  );

  checkAppVersion$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(checkAppVersion),
        withLatestFrom(
          this._store
            .select(confAPP)
            .pipe(
              filter(
                app =>
                  !!app &&
                  this._deviceService.isMobile &&
                  app.forceToReleaseUpdate === true &&
                  !!app.androidStore &&
                  !!app.iosStore,
              ),
            ),
          this._store.select(isConfLoaded).pipe(filter(loaded => loaded === true)),
        ),
        switchMap(([_, appConfig]) => this._deviceService.openUpdateModalIfNeeded(appConfig)),
      ),
    {dispatch: false},
  );

  constructor(
    private _configSVC: ConfService,
    private _actions$: Actions,
    private _store: Store,
    private _deviceService: DeviceService,
    @Inject(APP_VERSION) private _appVersion: string,
  ) {}
}
