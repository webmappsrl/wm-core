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
  take,
} from 'rxjs/operators';
import {of, from, interval, EMPTY} from 'rxjs';
import {
  currentUgcPoiId,
  currentUgcTrackId,
  deleteUgcMedia,
  deleteUgcMediaFailure,
  deleteUgcMediaSuccess,
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
  setCurrentUgcPoiDrawn,
  setCurrentUgcPoiDrawnSuccess,
  syncUgc,
  syncUgcFailure,
  syncUgcPois,
  syncUgcSuccess,
  syncUgcTracks,
  updateUgcPoi,
  updateUgcPoiFailure,
  updateUgcPoiSuccess,
  updateUgcTrack,
  updateUgcTrackFailure,
  updateUgcTrackSuccess,
} from '@wm-core/store/features/ugc/ugc.actions';
import {UgcService} from '@wm-core/store/features/ugc/ugc.service';
import {select, Store} from '@ngrx/store';
import {
  activableUgc,
  syncUgcIntervalEnabled,
  currentUgcPoiDrawnGeometry,
  currentUgcPoi,
} from '@wm-core/store/features/ugc/ugc.selector';
import {
  getUgcPoi,
  getUgcTrack,
  removeUgcPoi,
  removeUgcTrack,
  saveUgcPoi,
  saveUgcTrack,
} from '@wm-core/utils/localForage';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {areFeatureGeometriesEqual} from '@wm-core/utils/features';
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
        ofType(deleteUgcTrackFailure, deleteUgcPoiFailure, deleteUgcMediaFailure),
        switchMap(({error}) =>
          this._alertCtrl.create({
            header: this._langSvc.instant('Ops!'),
            message: this._langSvc.instant(`
              Non è stato possibile eliminare, riprova più tardi.
              ${error}
              `),
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
            const track = action.track;
            if (track) {
              return from(this._ugcSvc.deleteTrack(track)).pipe(
                mergeMap(() => [
                  deleteUgcTrackSuccess({track: action.track}),
                  syncUgcTracks(),
                  enableSyncInterval(),
                ]),
                catchError(error => of(deleteUgcTrackFailure({error}), enableSyncInterval())),
              );
            }
            return of(deleteUgcTrackFailure({error: 'Track not found'}));
          }),
        ),
      ),
    ),
  );
  loadUgcPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcSuccess),
      mergeMap(() => this._ugcSvc.loadUgcPois()),
      catchError(error => {
        console.error('Error loading UGC pois:', error);
        return of(syncUgcFailure({responseType: 'Pois', error})); // Dispatch a failure action in case of error
      }),
    ),
  );
  loadUgcTracks$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcSuccess),
      mergeMap(() => this._ugcSvc.loadUgcTracks()),
      catchError(error => {
        console.error('Error loading UGC tracks:', error);
        return of(syncUgcFailure({responseType: 'Tracks', error})); // Dispatch a failure action in case of error
      }),
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
        from(this._ugcSvc.syncUgc()).pipe(
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
      withLatestFrom(this._store.pipe(select(currentUgcPoiDrawnGeometry))),
      mergeMap(([action, poiDrawnGeometry]) =>
        of(disableSyncInterval()).pipe(
          mergeMap(() => {
            const poiId = action.poi?.properties?.id;
            if (poiId) {
              const updatedPoi = {
                ...action.poi,
                geometry: poiDrawnGeometry ?? action.poi?.geometry,
              };
              return from(this._ugcSvc.updateApiPoi(updatedPoi)).pipe(
                mergeMap(() => [
                  updateUgcPoiSuccess({poi: updatedPoi}),
                  syncUgcPois(),
                  enableSyncInterval(),
                ]),
                catchError(error => of(updateUgcPoiFailure({error}), enableSyncInterval())),
              );
            }
            return of(updateUgcPoiFailure({error: 'Poi ID not found'}));
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

  deleteUgcMedia$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcMedia),
      mergeMap(({media}) => {
        if(media?.id) {
          return from(this._alertCtrl.create({
            header: this._langSvc.instant('Conferma eliminazione'),
            message: this._langSvc.instant('Sei sicuro di voler eliminare questo media?'),
            buttons: [
              {
                text: this._langSvc.instant('Annulla'),
                role: 'cancel',
              },
              {
                text: this._langSvc.instant('Elimina'),
                role: 'destructive',
              },
            ],
          })).pipe(
            switchMap(modal => from(modal.present()).pipe(
              switchMap(() => from(modal.onDidDismiss()))
            )),
            switchMap((result) => {
              if (result.role === 'destructive') {
                return from(this._ugcSvc.deleteApiMedia(media.id)).pipe(
                  mergeMap(() => [
                    deleteUgcMediaSuccess({media}),
                    syncUgc(),
                  ]),
                  catchError(error => of(deleteUgcMediaFailure({error: error.error.message}))),
                );
              }
              return EMPTY;
            }),
          );
        }
        return of(deleteUgcMediaFailure({error: 'Media ID not found'}));
      }),
      catchError(error => of(deleteUgcMediaFailure({error}))),
    ),
  );

  deleteUgcMediaSuccess$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteUgcMediaSuccess),
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

  updateCurrentUgcPoiAfterUpdate$ = createEffect(() =>
    this._actions$.pipe(
      ofType(updateUgcPoiSuccess),
      filter(action => action.poi?.properties?.id != null),
      switchMap(action => {
        const poiId = action.poi?.properties?.id;
        return this._actions$.pipe(
          ofType(syncUgcSuccess),
          filter(syncAction => syncAction.responseType === 'Pois'),
          take(1),
          map(() => currentUgcPoiId({currentUgcPoiId: poiId})),
        );
      }),
    ),
  );

  updateCurrentUgcTrackAfterUpdate$ = createEffect(() =>
    this._actions$.pipe(
      ofType(updateUgcTrackSuccess),
      filter(action => action.track?.properties?.id != null),
      switchMap(action => {
        const trackId = action.track?.properties?.id;
        return this._actions$.pipe(
          ofType(syncUgcSuccess),
          filter(syncAction => syncAction.responseType === 'Tracks'),
          take(1),
          map(() => currentUgcTrackId({currentUgcTrackId: trackId})),
        );
      }),
    ),
  );

  setCurrentUgcPoiDrawn$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setCurrentUgcPoiDrawn),
      withLatestFrom(this._store.select(currentUgcPoi)),
      switchMap(([{currentUgcPoiDrawn}, currentUgcPoi]) => {
        if (currentUgcPoi && !areFeatureGeometriesEqual(currentUgcPoiDrawn, currentUgcPoi)) {
          return from(
            this._alertCtrl.create({
              header: this._langSvc.instant('Attenzione'),
              message: this._langSvc.instant(
                'Stai modificando le coordinate del POI, vuoi continuare?',
              ),
              buttons: [
                {
                  text: this._langSvc.instant('No'),
                  role: 'cancel',
                },
                {
                  text: this._langSvc.instant('Sì'),
                  role: 'confirm',
                },
              ],
            }),
          ).pipe(
            switchMap(alert => alert.present().then(() => alert.onDidDismiss())),
            filter(result => result.role === 'confirm'),
            map(() => setCurrentUgcPoiDrawnSuccess({currentUgcPoiDrawn})),
          );
        } else {
          return of(setCurrentUgcPoiDrawnSuccess({currentUgcPoiDrawn}));
        }
      }),
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
