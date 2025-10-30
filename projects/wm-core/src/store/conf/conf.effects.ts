import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, filter, map, switchMap, withLatestFrom, take} from 'rxjs/operators';
import {loadConf, loadConfFail, loadConfSuccess, updateMapWithUgc} from './conf.actions';
import {ConfService} from './conf.service';
import {select, Store} from '@ngrx/store';
import {activableUgc} from '@wm-core/store/features/ugc/ugc.selector';
import {isConfLoaded} from './conf.selector';
import {currentEcLayerId} from '../features/ec/ec.actions';
import {confHOME} from '@wm-core/store/conf/conf.selector';
import {IHOME, ILAYER, ILAYERBOX} from '@wm-core/types/config';
import {setLayer} from '../user-activity/user-activity.action';
import {DeviceService} from '@wm-core/services/device.service';
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
        this._store.select(confHOME).pipe(
          filter(home => home != null && home.length > 0),
          take(1),
          map(home => [action, home] as const),
        ),
      ),
      switchMap(([action, home]) => {
        const id = +action.currentEcLayerId;
        const layer: ILAYER =
          home
            .filter((item: IHOME) => item?.box_type === 'layer' && item.layer) // Filtra solo i box_type 'Layer'
            .map((item: ILAYERBOX) => item.layer) // Estrae il layer
            .find((layer: ILAYER) => +layer.id === +id) ?? null; // Trova il layer con id corrispondente

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

  constructor(
    private _configSVC: ConfService,
    private _actions$: Actions,
    private _store: Store,
    private _deviceService: DeviceService,
  ) {}
}
