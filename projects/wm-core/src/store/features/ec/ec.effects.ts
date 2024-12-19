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
  loadCurrentEcPoiSuccess,
  loadCurrentEcPoiFailure,
} from '@wm-core/store/features/ec/ec.actions';

import {setLayer} from '@wm-core/store/user-activity/user-activity.action';
import {currentEcPoiId} from './ec.actions';
import {pois} from '../features.selector';
const SYNC_INTERVAL = 600000;
@Injectable({
  providedIn: 'root',
})
export class EcEffects {
  currentEcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentEcPoiId),
      withLatestFrom(this._store.select(pois)),
      map(([actions, pois]) => {
        const ecPoi = pois.find(p => p?.properties?.id == actions.currentEcPoiId);
        return loadCurrentEcPoiSuccess({ecPoi});
      }),
      catchError(error => of(loadCurrentEcPoiFailure({error}))),
    ),
  );
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
        if (action?.filterTracks == null && action?.layer == null && action?.inputTyped == null) {
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
