import {Injectable} from '@angular/core';
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
import {confMAP, isConfLoaded, confAPP} from './conf.selector';
import {currentEcLayerId} from '../features/ec/ec.actions';
import {ILAYER} from '@wm-core/types/config';
import {setLayer} from '../user-activity/user-activity.action';
import {DeviceService} from '@wm-core/services/device.service';
import {getConfOverrides} from '@wm-core/utils/localForage';
import {ICONF} from '@wm-core/types/config';
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
          switchMap(async (conf: ICONF) => {
            conf = {
              ...conf,
              isMobile: this._deviceService.isMobile,
              isAppMobile: this._deviceService.isAppMobile,
            };
            // Applica gli override locali
            const overrides = await getConfOverrides();
            if (overrides) {
              conf = this._applyConfOverrides(conf, overrides);
            }
            return conf;
          }),
          map(conf => loadConfSuccess({conf})),
          catchError((_: any) => of(loadConfFail())),
        ),
      ),
    ),
  );

  private _applyConfOverrides(conf: ICONF, overrides: {[key: string]: any}): ICONF {
    const result = {...conf};
    
    // Applica override per ogni categoria
    Object.keys(overrides).forEach(category => {
      if (result[category] && typeof result[category] === 'object') {
        result[category] = this._deepMerge(result[category], overrides[category]);
      }
    });
    
    return result;
  }

  private _deepMerge(target: any, source: any): any {
    const output = {...target};
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, {[key]: source[key]});
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, {[key]: source[key]});
        }
      });
    }
    return output;
  }

  private _isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
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
          this._store.select(confAPP).pipe(
            filter(
              app =>
                !!app &&
                this._deviceService.isAppMobile &&
                app.forceToReleaseUpdate === true &&
                !!app.androidStore &&
                !!app.iosStore,
            ),
            take(1),
          ),
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
  ) {}
}
