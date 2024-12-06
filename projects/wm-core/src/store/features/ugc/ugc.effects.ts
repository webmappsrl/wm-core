import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {mergeMap, map, catchError, switchMap, filter, takeUntil, startWith} from 'rxjs/operators';
import {of, from, interval} from 'rxjs';
import {
  currentUgcTrackId,
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
import {activableUgc, ugcTracks} from './ugc.selector';
import {getUgcPois, getUgcTrack, getUgcTracks} from '@wm-core/utils/localForage';
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
      filter(activable => activable),
      switchMap(() =>
        interval(SYNC_INTERVAL).pipe(
          startWith(0),
          takeUntil(
            this._store.pipe(
              select(activableUgc),
              filter(activable => !activable),
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
        from(Promise.all([this._ugcSvc.syncUgcTracks(), this._ugcSvc.syncUgcPois()])).pipe(
          map(() => syncUgcSuccess({responseType: 'All'})),
          catchError(error => of(syncUgcFailure({responseType: 'All', error}))),
        ),
      ),
    ),
  );

  constructor(private _ugcSvc: UgcService, private _actions$: Actions, private _store: Store) {}
}
