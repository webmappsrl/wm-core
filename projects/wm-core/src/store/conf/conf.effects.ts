import {Inject, Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of, combineLatest, from} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  withLatestFrom,
  take,
  distinctUntilChanged,
  shareReplay,
} from 'rxjs/operators';
import {loadConf, loadConfFail, loadConfSuccess, updateMapWithUgc} from './conf.actions';
import {ConfService} from './conf.service';
import {select, Store} from '@ngrx/store';
import {activableUgc} from '@wm-core/store/features/ugc/ugc.selector';
import {confMAP, isConfLoaded} from './conf.selector';
import {isConfLoaded, confReleaseUpdate} from './conf.selector';
import {currentEcLayerId} from '../features/ec/ec.actions';
import {IHOME, ILAYER, ILAYERBOX, IAPP} from '@wm-core/types/config';
import {setLayer} from '../user-activity/user-activity.action';
import {DeviceService} from '@wm-core/services/device.service';
import {ModalController} from '@ionic/angular';
import {ModalReleaseUpdateComponent} from '../../modal-release-update/modal-release-update.component';
import {online} from '@wm-core/store/network/network.selector';
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
      combineLatest([
        this._store.select(confReleaseUpdate),
        this._store.select(online),
        this._store.select(isConfLoaded),
      ]).pipe(
        filter(
          ([releaseUpdate, isOnline, isLoaded]) =>
            isLoaded && isOnline && releaseUpdate.forceToReleaseUpdate === true,
        ),
        distinctUntilChanged((prev, curr) => {
          const [prevRelease, prevOnline] = prev;
          const [currRelease, currOnline] = curr;
          return (
            prevRelease.forceToReleaseUpdate === currRelease.forceToReleaseUpdate &&
            prevRelease.androidStore === currRelease.androidStore &&
            prevRelease.iosStore === currRelease.iosStore &&
            prevOnline === currOnline
          );
        }),
        switchMap(([releaseUpdate, isOnline]) => {
          if (!isOnline || !releaseUpdate.forceToReleaseUpdate) {
            return of(null);
          }

          // Check if mobile device
          if (!this._deviceService.isMobile) {
            return of(null);
          }

          // Create appConfig object for DeviceService methods
          const appConfig: IAPP = {
            forceToReleaseUpdate: releaseUpdate.forceToReleaseUpdate,
            androidStore: releaseUpdate.androidStore,
            iosStore: releaseUpdate.iosStore,
            sku: releaseUpdate.sku,
          } as IAPP;

          // Get last version using DeviceService
          const lastVersion$ = this._deviceService.getLastReleaseVersion(appConfig).pipe(
            shareReplay(1),
            catchError(() => of(null)),
          );

          // Check conditions and get store URL
          return combineLatest([
            lastVersion$.pipe(
              map(lastVersion => {
                if (!lastVersion) return false;
                if (!appConfig.androidStore || !appConfig.iosStore) return false;
                return lastVersion !== this._appVersion;
              }),
            ),
            lastVersion$,
          ]).pipe(
            take(1),
            switchMap(([shouldShow, lastVersion]) => {
              if (shouldShow && lastVersion) {
                const storeUrl = this._deviceService.getStoreUrl(appConfig);
                if (storeUrl) {
                  return from(
                    (async () => {
                      const modal = await this._modalController.create({
                        component: ModalReleaseUpdateComponent,
                        componentProps: {
                          storeUrl,
                          productionVersion: lastVersion,
                        },
                        backdropDismiss: true,
                        showBackdrop: true,
                      });
                      await modal.present();
                      return null;
                    })(),
                  );
                }
              }
              return of(null);
            }),
            catchError(() => of(null)),
          );
        }),
      ),
    {dispatch: false},
  );

  constructor(
    private _configSVC: ConfService,
    private _actions$: Actions,
    private _store: Store,
    private _deviceService: DeviceService,
    private _modalController: ModalController,
    @Inject(APP_VERSION) private _appVersion: string,
  ) {}
}
