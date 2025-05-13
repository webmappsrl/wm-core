import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';

import {EcService} from './ec.service';
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

@Injectable({
  providedIn: 'root',
})
export class EcEffects {
  currentEcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentEcTrackId),
      switchMap(action =>
        from(this._ecSvc.getEcTrack(action.currentEcTrackId)).pipe(
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
        this._ecSvc.getPois().pipe(
          map(featureCollection => loadEcPoisSuccess({featureCollection})),
          catchError(() => of(loadEcPoisFailure())),
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

  constructor(private _ecSvc: EcService, private _actions$: Actions) {}
}
