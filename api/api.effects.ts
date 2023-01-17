import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {query, queryApiFail, queryApiSuccess} from './api.actions';
import {ApiService} from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ApiEffects {
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(query),
      switchMap(action =>
        this._apiSVC.getQuery(action.inputTyped, action.layer).pipe(
          map(search => queryApiSuccess({search})),
          catchError(e => of(queryApiFail())),
        ),
      ),
    ),
  );

  constructor(private _apiSVC: ApiService, private _actions$: Actions) {}
}
