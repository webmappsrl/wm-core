import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {loadPois, loadPoisSuccess, loadPoisFail} from './pois.actions';
import {PoisService} from './pois.service';

@Injectable({
  providedIn: 'root',
})
export class PoisEffects {
  loadPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadPois),
      switchMap(() =>
        this._poisSvc.getPois().pipe(
          map(featureCollection => loadPoisSuccess({featureCollection})),
          catchError(() => of(loadPoisFail())),
        ),
      ),
    ),
  );

  constructor(private _poisSvc: PoisService, private _actions$: Actions) {}
}
