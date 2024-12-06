import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, interval, of} from 'rxjs';
import {catchError, map, startWith, switchMap, withLatestFrom} from 'rxjs/operators';

import {EcService} from './ec.service';
import {ApiRootState} from './ec.reducer';
import {Store} from '@ngrx/store';
import {IRESPONSE} from '@wm-core/types/elastic';
import {
  currentEcTrackId,
  loadCurrentEcTrackFailure,
  loadCurrentEcTrackSuccess,
  loadEcPois,
  loadEcPoisFail,
  loadEcPoisSuccess,
  queryEc,
  queryEcFail,
  queryEcSuccess,
  setLayer,
  toggleTrackFilterByIdentifier,
} from '@wm-core/store/features/ec/ec.actions';
import {Filter} from '@wm-core/types/config';
import {userActivity} from '@wm-core/store/user-activity/user-activity.selector';
import {ec} from './ec.selector';
const SYNC_INTERVAL = 60000;
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
          startWith(0),
          switchMap(() =>
            this._ecSvc.getPois().pipe(
              map(featureCollection => loadEcPoisSuccess({featureCollection})),
              catchError(() => of(loadEcPoisFail())),
            ),
          ),
        ),
      ),
    ),
  );
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(queryEc),
      withLatestFrom(
        this._store.select(ec), // Selettore per ec
        this._store.select(userActivity), // Selettore per userActivity
      ),
      switchMap(([action, ec, userActivity]) => {
        if (action.init) {
          return from(this._ecSvc.getQuery({})).pipe(
            map((response: IRESPONSE) => queryEcSuccess({response})),
            catchError(e => of(queryEcFail())),
          );
        }
        if (ec.filterTracks.length === 0 && ec.layer == null && userActivity.inputTyped == null) {
          return of(queryEcFail());
        }
        const newAction = {
          ...action,
          ...{filterTracks: ec.filterTracks},
          ...{layer: ec.layer},
          ...{inputTyped: userActivity.inputTyped},
        };
        return from(this._ecSvc.getQuery(newAction)).pipe(
          map((response: IRESPONSE) => queryEcSuccess({response})),
          catchError(e => of(queryEcFail())),
        );
      }),
    ),
  );
  setLayerApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setLayer),
      switchMap(_ => {
        return of(queryEc({}));
      }),
    ),
  );
  toggleTrackFilterByIdentifier$ = createEffect(() =>
    this._actions$.pipe(
      ofType(toggleTrackFilterByIdentifier),
      withLatestFrom(this._store),
      //@ts-ignore
      switchMap(([action, state]) => {
        let filters: Filter[] = [];
        try {
          filters = state['conf']['MAP'].filters[action.taxonomy].options;
        } catch (_) {}
        let filter = filters.filter(f => f.identifier === action.identifier);
        if (filter.length > 0) {
          return of({
            type: '[ec] toggle track filter',
            filter: {...filter[0], taxonomy: action.taxonomy},
          });
        }
      }),
    ),
  );

  constructor(
    private _ecSvc: EcService,
    private _actions$: Actions,
    private _store: Store<ApiRootState>,
  ) {}
}
