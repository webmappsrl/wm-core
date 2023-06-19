import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, of} from 'rxjs';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {
  addTrackFilters,
  inputTyped,
  loadPois,
  loadPoisFail,
  loadPoisSuccess,
  query,
  queryApiFail,
  queryApiSuccess,
  removeTrackFilters,
  setLayer,
  toggleTrackFilterByIdentifier,
} from './api.actions';
import {ApiService} from './api.service';
import {ApiRootState} from './api.reducer';
import {Store} from '@ngrx/store';
import {SearchResponse} from 'elasticsearch';
import {apiTrackFilterIdentifier} from './api.selector';

@Injectable({
  providedIn: 'root',
})
export class ApiEffects {
  addFilterTrackApi$ = createEffect(() =>
    this._store.select(apiTrackFilterIdentifier).pipe(
      withLatestFrom(this._store),
      switchMap(([trackFilterIdentifier, state]) => {
        const api = state['query'];
        return of({
          type: '[api] Query',
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
          type: '[api] Query',
        });
      }),
    ),
  );
  loadPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadPois),
      switchMap(() =>
        this._apiSVC.getPois().pipe(
          map(featureCollection => loadPoisSuccess({featureCollection})),
          catchError(() => of(loadPoisFail())),
        ),
      ),
    ),
  );
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(query),
      withLatestFrom(this._store),
      switchMap(([action, state]) => {
        const api = state['query'];
        if (action.init) {
          return from(this._apiSVC.getQuery({})).pipe(
            map((search: SearchResponse<any>) => queryApiSuccess({search})),
            catchError(e => of(queryApiFail())),
          );
        }
        if (api.filterTracks.length === 0 && api.layer == null && api.inputTyped == null) {
          return of(queryApiFail());
        }
        const newAction = {
          ...action,
          ...{filterTracks: api.filterTracks},
          ...{layer: api.layer},
          ...{inputTyped: api.inputTyped},
        };
        return from(this._apiSVC.getQuery(newAction)).pipe(
          map((search: SearchResponse<any>) => queryApiSuccess({search})),
          catchError(e => of(queryApiFail())),
        );
      }),
    ),
  );
  removeTrackFiltersApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(removeTrackFilters),
      switchMap(_ => {
        return of({
          type: '[api] Query',
        });
      }),
    ),
  );
  setLayerApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setLayer),
      switchMap(_ => {
        return of({
          type: '[api] Query',
        });
      }),
    ),
  );
  toggleTrackFilterByIdentifier$ = createEffect(() =>
    this._actions$.pipe(
      ofType(toggleTrackFilterByIdentifier),
      withLatestFrom(this._store),
      switchMap(([action, state]) => {
        let filters = [];
        try {
          filters = state['conf']['MAP'].filters[action.taxonomy].options;
        } catch (_) {}
        let filter = filters.filter(f => f.identifier === action.identifier);
        if (filter.length > 0) {
          return of({
            type: '[api] toggle track filter',
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
