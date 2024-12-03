import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, filter, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {loadConf, loadConfFail, loadConfSuccess, updateMapWithUgc} from './conf.actions';
import {ConfService} from './conf.service';
import {select, Store} from '@ngrx/store';
import {activableUgc} from '@wm-core/store/features/ugc/ugc.selector';
import {isConfLoaded} from './conf.selector';
const SYNC_INTERVAL = 60000;
@Injectable({
  providedIn: 'root',
})
export class ConfEffects {
  loadConf$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadConf),
      switchMap(() =>
        this._configSVC.getConf().pipe(
          map(conf => loadConfSuccess({conf})),
          catchError((_: any) => of(loadConfFail())),
        ),
      ),
    ),
  );
  updateMapWithUgc$ = createEffect(() =>
    this._store.pipe(
      select(activableUgc), // Osserva i cambiamenti del selettore
      withLatestFrom(this._store.select(isConfLoaded)),
      filter(([_, isLoaded]) => isLoaded),
      map(([activableUgc]) => updateMapWithUgc({activableUgc})), // Dispatch dell'azione con il valore del selettore
    ),
  );

  constructor(private _configSVC: ConfService, private _actions$: Actions, private _store: Store) {}
}
