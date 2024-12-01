import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, of} from 'rxjs';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';

import {ApiService} from './ec.service';
import {ApiRootState} from './ec.reducer';
import {Store} from '@ngrx/store';
import {IRESPONSE} from '@wm-core/types/elastic';
import {apiTrackFilterIdentifier} from '@wm-core/store/features/ec/ec.selector';
import {
  inputTyped,
  loadEcPois,
  loadEcPoisFail,
  loadEcPoisSuccess,
  queryEc,
  queryEcFail,
  queryEcSuccess,
  removeTrackFilters,
  setLayer,
  toggleTrackFilterByIdentifier,
} from '@wm-core/store/features/ec/ec.actions';
import {Filter} from '@wm-core/types/config';

@Injectable({
  providedIn: 'root',
})
export class EcEffects {
  addFilterTrackApi$ = createEffect(() =>
    this._store.select(apiTrackFilterIdentifier).pipe(
      withLatestFrom(this._store),
      switchMap(([trackFilterIdentifier, state]) => {
        const api = state['query'];
        return of({
          type: '[ec] Query',
          ...{filterTracks: trackFilterIdentifier},
          ...{layer: api.layer},
          ...{inputTyped: api.inputTyped},
        });
      }),
    ),
  );
  inputTypedApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(inputTyped),
      switchMap(_ => {
        return of({
          type: '[ec] Query',
        });
      }),
    ),
  );
  loadEcPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadEcPois),
      switchMap(() =>
        this._apiSVC.getPois().pipe(
          map(featureCollection => loadEcPoisSuccess({featureCollection})),
          catchError(() => of(loadEcPoisFail())),
        ),
      ),
    ),
  );
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(queryEc),
      withLatestFrom(this._store),
      switchMap(([action, state]) => {
        const api = state['query'];
        if (action.init) {
          return from(this._apiSVC.getQuery({})).pipe(
            map((response: IRESPONSE) => queryEcSuccess({response})),
            catchError(e => of(queryEcFail())),
          );
        }
        if (api.filterTracks.length === 0 && api.layer == null && api.inputTyped == null) {
          return of(queryEcFail());
        }
        const newAction = {
          ...action,
          ...{filterTracks: api.filterTracks},
          ...{layer: api.layer},
          ...{inputTyped: api.inputTyped},
        };
        return from(this._apiSVC.getQuery(newAction)).pipe(
          map((response: IRESPONSE) => queryEcSuccess({response})),
          catchError(e => of(queryEcFail())),
        );
      }),
    ),
  );
  removeTrackFiltersApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(removeTrackFilters),
      switchMap(_ => {
        return of({
          type: '[ec] Query',
        });
      }),
    ),
  );
  setLayerApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setLayer),
      switchMap(_ => {
        return of({
          type: '[ec] Query',
        });
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
    private _apiSVC: ApiService,
    private _actions$: Actions,
    private _store: Store<ApiRootState>,
  ) {}
}