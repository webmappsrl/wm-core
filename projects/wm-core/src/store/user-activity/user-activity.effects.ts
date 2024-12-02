import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {
  applyWhere,
  queryEcSuccess,
  queryEcFail,
  setLayer,
  toggleTrackFilter,
  updateTrackFilter,
  queryEc,
} from '@wm-core/store/features/ec/ec.actions';
import {
  closeUgc,
  removeTrackFilters,
  resetTrackFilters,
  setLoading,
} from '@wm-core/store/user-activity/user-activity.action';
import {inputTyped as inputTypedSelector} from '@wm-core/store/user-activity/user-activity.selector';
import {debounceTime, map, switchMap} from 'rxjs/operators';

@Injectable()
export class UserActivityEffects {
  removeTrackFilters$ = createEffect(() =>
    this._actions$.pipe(
      ofType(removeTrackFilters),
      map(() => queryEc({})),
    ),
  );
  setLoadingStart$ = createEffect(() =>
    this._actions$.pipe(
      ofType(resetTrackFilters, setLayer, toggleTrackFilter, updateTrackFilter, applyWhere),
      map(() => setLoading({loading: true})),
    ),
  );
  setLoadingStopFail$ = createEffect(() =>
    this._actions$.pipe(
      ofType(queryEcFail),
      map(() => setLoading({loading: false})),
    ),
  );
  setLoadingStopSuccess$ = createEffect(() =>
    this._actions$.pipe(
      ofType(queryEcSuccess),
      map(() => setLoading({loading: false})),
    ),
  );
  triggerQueryOnInput$ = createEffect(() =>
    this._store.select(inputTypedSelector).pipe(
      debounceTime(300),
      map(inputTyped => inputTyped?.trim()),
      switchMap(inputTyped => {
        if (inputTyped == null || inputTyped === '') {
          return [];
        }
        return [
          queryEc({
            init: false,
            inputTyped: inputTyped as string,
          }),
          closeUgc(),
        ];
      }),
    ),
  );

  constructor(private _actions$: Actions, private _store: Store) {}
}
