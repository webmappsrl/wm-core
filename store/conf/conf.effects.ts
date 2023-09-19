import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {loadConf, loadConfFail, loadConfSuccess} from './conf.actions';
import * as localForage from 'localforage';
import {ConfService} from './conf.service';
@Injectable({
  providedIn: 'root',
})
export class ConfEffects {
  loadConf$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadConf),
      switchMap(() =>
        this._configSVC.getConf().pipe(
          map(conf => {
            localStorage.setItem('conf', JSON.stringify(conf));
            return loadConfSuccess({conf});
          }),
          catchError((_: any) => {
            const confStringed = localStorage.getItem('conf');
            if (confStringed != null) {
              const conf = JSON.parse(confStringed);
              return of(loadConfSuccess({conf}));
            } else {
              return of(loadConfFail());
            }
          }),
        ),
      ),
    ),
  );

  constructor(private _configSVC: ConfService, private _actions$: Actions) {}
}
