import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {
  mergeMap,
  map,
  catchError,
  switchMap,
  filter,
  takeUntil,
  startWith,
  withLatestFrom,
} from 'rxjs/operators';
import {of, from, interval, EMPTY} from 'rxjs';
import {
  currentUgcPoiId,
  currentUgcTrackId,
  deleteUgcPoi,
  deleteUgcPoiFailure,
  deleteUgcPoiSuccess,
  deleteUgcTrack,
  deleteUgcTrackFailure,
  deleteUgcTrackSuccess,
  disableSyncInterval,
  enableSyncInterval,
  loadcurrentUgcPoiIdFailure,
  loadcurrentUgcPoiIdSuccess,
  loadCurrentUgcTrackFailure,
  loadCurrentUgcTrackSuccess,
  syncUgc,
  syncUgcFailure,
  syncUgcPois,
  syncUgcSuccess,
  syncUgcTracks,
  updateUgcPoi,
  updateUgcPoiFailure,
  updateUgcPois,
  updateUgcPoiSuccess,
  updateUgcTrack,
  updateUgcTrackFailure,
  updateUgcTracks,
  updateUgcTrackSuccess,
} from '@wm-core/store/features/ugc/ugc.actions';
import {UgcService} from '@wm-core/store/features/ugc/ugc.service';
import {select, Store} from '@ngrx/store';
import {activableUgc, syncUgcIntervalEnabled} from './ugc.selector';
import {
  getUgcPoi,
  getUgcPois,
  getUgcTrack,
  getUgcTracks,
  removeUgcPoi,
  removeUgcTrack,
  saveUgcPoi,
  saveUgcTrack,
} from '@wm-core/utils/localForage';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {openUgc} from '@wm-core/store/user-activity/user-activity.action';
const SYNC_INTERVAL = 60000;
@Injectable({
  providedIn: 'root',
})
export class UgcEffects {
  currentUgcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentUgcPoiId),
      switchMap(action => from(getUgcPoi(action.currentUgcPoiId))),
      map(ugcPoi => loadcurrentUgcPoiIdSuccess({ugcPoi})),
      catchError(error => of(loadcurrentUgcPoiIdFailure({error}))),
    ),
  );
  currentUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentUgcTrackId),
      switchMap(action => from(getUgcTrack(action.currentUgcTrackId))),
      map(ugcTrack => loadCurrentUgcTrackSuccess({ugcTrack})),
      catchError(error => of(loadCurrentUgcTrackFailure({error}))),
    ),
  );
  deleteUgcFailure$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteUgcTrackFailure, deleteUgcPoiFailure),
        switchMap(() =>
          this._alertCtrl.create({
            header: this._langSvc.instant('Ops!'),
            message: this._langSvc.instant('Non è stato possibile eliminare, riprova più tardi'),
            buttons: ['OK'],
          }),
        ),
        switchMap(alert => alert.present()),
      ),
    {dispatch: false},
  );
  deleteUgcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcPoi),
      mergeMap(action =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            const poiId = action.poi?.properties?.id;
            if (poiId) {
              return from(this._ugcSvc.deleteApiPoi(poiId)).pipe(
                mergeMap(() => [
                  deleteUgcPoiSuccess({poi: action.poi}),
                  syncUgcPois(),
                  enableSyncInterval(),
                ]),
                catchError(error => of(deleteUgcPoiFailure({error}), enableSyncInterval())),
              );
            }
            return of(deleteUgcPoiFailure({error: 'Poi ID not found'}));
          }),
        ),
      ),
    ),
  );
  deleteUgcSuccess$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteUgcTrackSuccess, deleteUgcPoiSuccess),
        switchMap(action => {
          action.type === deleteUgcTrackSuccess.type
            ? removeUgcTrack(action.track)
            : removeUgcPoi(action.poi);
          return of(EMPTY);
        }),
        switchMap(() => {
          return this._alertCtrl.create({
            message: this._langSvc.instant('Eliminazione effettuata con successo'),
            buttons: ['OK'],
          });
        }),
        switchMap(alert => alert.present()),
      ),
    {dispatch: false},
  );
  deleteUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcTrack),
      mergeMap(action =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            const trackId = action.track?.properties?.id;
            if (trackId) {
              return from(this._ugcSvc.deleteApiTrack(trackId)).pipe(
                mergeMap(() => [
                  deleteUgcTrackSuccess({track: action.track}),
                  syncUgcTracks(),
                  enableSyncInterval(),
                ]),
                catchError(error => of(deleteUgcTrackFailure({error}), enableSyncInterval())),
              );
            }
            return of(deleteUgcTrackFailure({error: 'Track ID not found'}));
          }),
        ),
      ),
    ),
  );
  loadUgcPois$ = createEffect(() =>
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
  loadUgcTracks$ = createEffect(() =>
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
  openUgcEffect$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentUgcTrackId, currentUgcPoiId), // Ascolta entrambe le azioni
      filter(
        action =>
          ('currentUgcPoiId' in action && action.currentUgcPoiId !== null) ||
          ('currentUgcTrackId' in action && action.currentUgcTrackId != null),
      ), // Controlla che il valore non sia null
      map(() => openUgc()), // Dispatcha l'azione openUgc
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
              filter(([activable, syncEnabled]) => !activable || !syncEnabled),
            ),
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
        from(
          Promise.all([
            this._ugcSvc.syncUgcTracks(),
            this._ugcSvc.syncUgcPois(),
            this._ugcSvc.syncUgcMedias(),
          ]),
        ).pipe(
          map(() => syncUgcSuccess({responseType: 'All'})),
          catchError(error => of(syncUgcFailure({responseType: 'All', error}))),
        ),
      ),
    ),
  );
  updateUgcFailure$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateUgcTrackFailure, updateUgcPoiFailure),
        switchMap(() =>
          this._alertCtrl.create({
            header: this._langSvc.instant('Ops!'),
            message: this._langSvc.instant('Non è stato possibile aggiornare, riprova più tardi'),
            buttons: ['OK'],
          }),
        ),
        switchMap(alert => alert.present()),
      ),
    {dispatch: false},
  );
  updateUgcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(updateUgcPoi),
      mergeMap(action =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            const poiId = action.poi?.properties?.id;
            if (poiId) {
              return from(this._ugcSvc.updateApiPoi(action.poi)).pipe(
                mergeMap(() => [
                  updateUgcPoiSuccess({poi: action.poi}),
                  syncUgcPois(),
                  enableSyncInterval(),
                ]),
                catchError(error => of(updateUgcTrackFailure({error}), enableSyncInterval())),
              );
            }
            return of(updateUgcTrackFailure({error: 'Track ID not found'}));
          }),
        ),
      ),
    ),
  );
  updateUgcSuccess$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateUgcTrackSuccess, updateUgcPoiSuccess),
        switchMap(action => {
          action.type === updateUgcTrackSuccess.type
            ? saveUgcTrack(action.track)
            : saveUgcPoi(action.poi);
          return of(EMPTY);
        }),
        switchMap(() => {
          return this._alertCtrl.create({
            message: this._langSvc.instant('Aggiornamento effettuato con successo'),
            buttons: ['OK'],
          });
        }),
        switchMap(alert => alert.present()),
      ),
    {dispatch: false},
  );
  updateUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(updateUgcTrack),
      mergeMap(action =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            const trackId = action.track?.properties?.id;
            if (trackId) {
              return from(this._ugcSvc.updateApiTrack(action.track)).pipe(
                mergeMap(() => [
                  updateUgcTrackSuccess({track: action.track}),
                  syncUgcTracks(),
                  enableSyncInterval(),
                ]),
                catchError(error => of(updateUgcTrackFailure({error}), enableSyncInterval())),
              );
            }
            return of(updateUgcTrackFailure({error: 'Track ID not found'}));
          }),
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
