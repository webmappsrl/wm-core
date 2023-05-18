import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {
  addActivities,
  query,
  queryApiFail,
  queryApiSuccess,
  removeActivities,
  setLayerID,
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
  setLayerIDApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setLayerID),
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
        const newAction = {...action, ...{activities: api.activities}, ...{layer: api.layerID}};
        return this._apiSVC.getQuery(newAction).pipe(
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
