import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, interval, of} from 'rxjs';
import {catchError, filter, map, startWith, switchMap, withLatestFrom} from 'rxjs/operators';

import {EcService} from './ec.service';
import {ApiRootState} from './ec.reducer';
import {Store} from '@ngrx/store';
import {IRESPONSE} from '@wm-core/types/elastic';
import {
  currentEcTrackId,
  loadCurrentEcTrackFailure,
  loadCurrentEcTrackSuccess,
  loadEcPois,
  loadEcPoisFailure,
  loadEcPoisSuccess,
  ecTracks,
  ecTracksFailure,
  ecTracksSuccess,
} from '@wm-core/store/features/ec/ec.actions';

import {setLayer} from '@wm-core/store/user-activity/user-activity.action';
const SYNC_INTERVAL = 600000;
@Injectable({
  providedIn: 'root',
})
export class EcEffects {
  currentEcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentEcTrackId),
      switchMap(action =>
        from(this._ecSvc.getEcTrack(+action.currentEcTrackId)).pipe(
          map(ecTrack => loadCurrentEcTrackSuccess({ecTrack})),
          catchError(error => of(loadCurrentEcTrackFailure({error}))),
        ),
      ),
    ),
  );
  loadEcPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadEcPois),
      switchMap(() =>
        interval(SYNC_INTERVAL).pipe(
          switchMap(() =>
            this._ecSvc.getPois().pipe(
              map(featureCollection => loadEcPoisSuccess({featureCollection})),
              catchError(() => of(loadEcPoisFailure())),
            ),
          ),
        ),
      ),
    ),
  );
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(ecTracks),
      switchMap(action => {
        if (action.init) {
          return from(this._ecSvc.getQuery({})).pipe(
            map((response: IRESPONSE) => ecTracksSuccess({response})),
            catchError(e => of(ecTracksFailure())),
          );
        }
        if (
          action?.filterTracks?.length === 0 &&
          action?.layer == null &&
          action?.inputTyped == null
        ) {
          return of(ecTracksFailure());
        }
        const newAction = {
          filterTracks: action.filterTracks,
          layer: action.layer,
          inputTyped: action.inputTyped,
        };
        return from(this._ecSvc.getQuery(newAction)).pipe(
          map((response: IRESPONSE) => ecTracksSuccess({response})),
          catchError(e => of(ecTracksFailure())),
        );
      }),
    ),
  );
  setLayerApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setLayer),
      switchMap(_ => {
        return of(ecTracks({}));
      }),
    ),
  );

  constructor(
    private _ecSvc: EcService,
    private _actions$: Actions,
    private _store: Store<ApiRootState>,
  ) {}
}
