import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, of} from 'rxjs';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {
  addActivities,
  inputTyped,
  query,
  queryApiFail,
  queryApiSuccess,
  removeActivities,
  setLayer,
} from './api.actions';
import {ApiService} from './api.service';
import {IElasticSearchRootState} from './api.reducer';
import {Store} from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class ApiEffects {
  addActivitiesApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(addActivities),
      switchMap(_ => {
        return of({
          type: '[api] Query',
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
  removeActivitiesApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(removeActivities),
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
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(query),
      withLatestFrom(this._store),
      switchMap(([action, state]) => {
        const api = state['query'];
        if (api.activities.length === 0 && api.layer == null && api.inputTyped == null) {
          return of(queryApiFail());
        }
        const newAction = {
          ...action,
          ...{activities: api.activities},
          ...{layer: api.layer},
          ...{inputTyped: api.inputTyped},
        };
        return from(this._apiSVC.getQuery(newAction)).pipe(
          map(search => queryApiSuccess({search})),
          catchError(e => of(queryApiFail())),
        );
      }),
    ),
  );
  constructor(
    private _apiSVC: ApiService,
    private _actions$: Actions,
    private _store: Store<IElasticSearchRootState>,
  ) {}
}
