import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {mergeMap, map, catchError, switchMap, filter, takeUntil, startWith, finalize, tap, withLatestFrom} from 'rxjs/operators';
import {of, from, interval} from 'rxjs';
import {
  currentUgcTrackId,
  deleteUgcPoi,
  deleteUgcPoiFailure,
  deleteUgcPoiSuccess,
  deleteUgcTrack,
  deleteUgcTrackFailure,
  deleteUgcTrackSuccess,
  disableSyncInterval,
  enableSyncInterval,
  loadCurrentUgcTrackFailure,
  loadCurrentUgcTrackSuccess,
  syncUgc,
  syncUgcFailure,
  syncUgcPois,
  syncUgcSuccess,
  syncUgcTracks,
  updateUgcPois,
  updateUgcTracks,
} from '@wm-core/store/features/ugc/ugc.actions';
import {UgcService} from '@wm-core/store/features/ugc/ugc.service';
import {select, Store} from '@ngrx/store';
import {activableUgc, syncUgcIntervalEnabled} from './ugc.selector';
import {getUgcPois, getUgcTrack, getUgcTracks, removeDeviceUgcPoi, removeDeviceUgcTrack, removeSynchronizedUgcPoi, removeSynchronizedUgcTrack} from '@wm-core/utils/localForage';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
const SYNC_INTERVAL = 60000;
@Injectable({
  providedIn: 'root',
})
export class UgcEffects {
  currentUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentUgcTrackId),
      switchMap(action =>
        from(from(getUgcTrack(`${action.currentUgcTrackId}`))).pipe(
          map(ugcTrack => loadCurrentUgcTrackSuccess({ugcTrack})),
          catchError(error => of(loadCurrentUgcTrackFailure({error}))),
        ),
      ),
    ),
  );
  deleteUgcFailure$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcTrackFailure, deleteUgcPoiFailure),
      switchMap(() => this._alertCtrl.create({
        header: this._langSvc.instant('Ops!'),
        message: this._langSvc.instant('Non è stato possibile eliminare il tracciato, riprova più tardi'),
        buttons: ['OK']
      })),
      switchMap(alert => alert.present()),
    ),
    { dispatch: false }
  );
  deleteUgcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcPoi),
      mergeMap(action =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            if (action.poi?.properties?.id) {
              const poiId = action.poi?.properties?.id;
              return from(this._ugcSvc.deleteApiPoi(poiId)).pipe(
                tap(() => removeSynchronizedUgcPoi(poiId)),
                mergeMap(() => [
                  deleteUgcPoiSuccess(),
                  syncUgcPois(),
                  enableSyncInterval()
                ]),
                catchError(error => of(deleteUgcPoiFailure({error}), enableSyncInterval())),
              );
            }

            return from(removeDeviceUgcPoi(action.poi?.properties?.uuid)).pipe(
              mergeMap(() => [
                deleteUgcPoiSuccess(),
                syncUgcPois(),
                enableSyncInterval()
              ]),
              catchError(error => of(deleteUgcPoiFailure({error}), enableSyncInterval())),
            );
          })
        )
      ),
    ),
  );
  deleteUgcSuccess$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcTrackSuccess, deleteUgcPoiSuccess),
      switchMap(() => this._alertCtrl.create({
        message: this._langSvc.instant('Tracciato eliminato con successo'),
        buttons: ['OK']
      })),
      switchMap(alert => alert.present()),
    ),
    { dispatch: false }
  );
  deleteUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcTrack),
      mergeMap(action =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            if (action.track?.properties?.id) {
              const trackId = action.track?.properties?.id;
              return from(this._ugcSvc.deleteApiTrack(trackId)).pipe(
                tap(() => removeSynchronizedUgcTrack(trackId)),
                mergeMap(() => [
                  deleteUgcTrackSuccess(),
                  syncUgcTracks(),
                  enableSyncInterval()
                ]),
                catchError(error => of(deleteUgcTrackFailure({error}), enableSyncInterval())),
              );
            }

            return from(removeDeviceUgcTrack(action.track?.properties?.uuid)).pipe(
              mergeMap(() => [
                deleteUgcTrackSuccess(),
                syncUgcTracks(),
                enableSyncInterval()
              ]),
              catchError(error => of(deleteUgcTrackFailure({error}), enableSyncInterval())),
            );
          })
        )
      ),
    ),
  );
  deleyeUgcError$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcTrackFailure, deleteUgcPoiFailure),
      switchMap((action) => {
        const entity = action.type === deleteUgcTrackFailure.type ? 'tracciato' : 'POI';
        return this._alertCtrl.create({
        header: this._langSvc.instant('Ops!'),
        message: this._langSvc.instant(`Non è stato possibile eliminare il ${entity}, riprova più tardi`),
        buttons: ['OK']
      })
    }),
      switchMap(alert => alert.present()),
    ),
    { dispatch: false }
  );
  loadUgcPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcSuccess),
      mergeMap(() =>
        from(getUgcTracks()).pipe(
          map(ugcTrackFeatures => updateUgcTracks({ugcTrackFeatures})), // Dispatch dell'azione con i dati caricati
          catchError(error => {
            console.error('Error loading UGC tracks:', error);
            return of(syncUgcFailure({responseType: 'Tracks', error})); // Dispatch a failure action in case of error
          }),
        ),
      ),
    ),
  );
  loadUgcTracks$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcSuccess),
      mergeMap(() =>
        from(getUgcPois()).pipe(
          map(ugcPoiFeatures => updateUgcPois({ugcPoiFeatures})), // Dispatch dell'azione con i dati caricati
          catchError(error => {
            console.error('Error loading UGC pois:', error);
            return of(syncUgcFailure({responseType: 'Pois', error})); // Dispatch a failure action in case of error
          }),
        ),
      ),
    ),
  );
  syncOnInterval$ = createEffect(() =>
    this._store.pipe(
      select(activableUgc),
      withLatestFrom(this._store.pipe(select(syncUgcIntervalEnabled))),
      filter(([activable, syncEnabled]) => activable && syncEnabled),
      switchMap(() =>
        interval(SYNC_INTERVAL).pipe(
          startWith(0),
          takeUntil(
            this._store.pipe(
              select(activableUgc),
              withLatestFrom(this._store.pipe(select(syncUgcIntervalEnabled))),
              filter(([activable, syncEnabled]) => !activable || !syncEnabled)
            )
          ),
          map(() => syncUgc()),
        ),
      ),
    ),
  );
  syncPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcPois),
      mergeMap(() =>
        from(this._ugcSvc.syncUgcPois()).pipe(
          map(() => syncUgcSuccess({responseType: 'Pois'})),
          catchError(error => of(syncUgcFailure({responseType: 'Pois', error}))),
        ),
      ),
    ),
  );
  syncTracks$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcTracks),
      mergeMap(() =>
        from(this._ugcSvc.syncUgcTracks()).pipe(
          map(() => syncUgcSuccess({responseType: 'Tracks'})),
          catchError(error => of(syncUgcFailure({responseType: 'Tracks', error}))),
        ),
      ),
    ),
  );
  syncUgc$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgc),
      mergeMap(() =>
        from(Promise.all([this._ugcSvc.syncUgcTracks(), this._ugcSvc.syncUgcPois()])).pipe(
          map(() => syncUgcSuccess({responseType: 'All'})),
          catchError(error => of(syncUgcFailure({responseType: 'All', error}))),
        ),
      ),
    ),
  );

  constructor(
    private _ugcSvc: UgcService,
    private _actions$: Actions,
    private _store: Store,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
  ) {}
}
