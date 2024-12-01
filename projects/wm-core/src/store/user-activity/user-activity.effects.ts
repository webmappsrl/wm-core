import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {
  applyWhere,
  queryEcSuccess,
  queryEcFail,
  resetTrackFilters,
  setLayer,
  toggleTrackFilter,
  updateTrackFilter,
  queryEc,
} from '@wm-core/store/features/ec/ec.actions';
import {closeUgc, setLoading} from '@wm-core/store/user-activity/user-activity.action';
import {inputTyped as inputTypedSelector} from '@wm-core/store/user-activity/user-activity.selector';
import {debounceTime, map, switchMap} from 'rxjs/operators';

@Injectable()
export class UserActivityEffects {
  // Effetto per abilitare il loading quando inizia un'azione
  setLoadingStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resetTrackFilters, setLayer, toggleTrackFilter, updateTrackFilter, applyWhere),
      map(() => setLoading({loading: true})), // Attiva il caricamento
    ),
  );
  // Effetto per disabilitare il loading al completamento con errore
  setLoadingStopFail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(queryEcFail),
      map(() => setLoading({loading: false})), // Disattiva il caricamento
    ),
  );
  // Effetto per disabilitare il loading al completamento con successo
  setLoadingStopSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(queryEcSuccess),
      map(() => setLoading({loading: false})), // Disattiva il caricamento
    ),
  );
  triggerQueryOnInput$ = createEffect(() =>
    this._store.select(inputTypedSelector).pipe(
      debounceTime(300), // Evita chiamate troppo frequenti (300ms)
      map(inputTyped => inputTyped?.trim()), // Rimuove spazi inutili
      switchMap(inputTyped => {
        if (inputTyped == null || inputTyped === '') {
          return []; // Non fa nulla se l'input è vuoto
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

  constructor(private actions$: Actions, private _store: Store) {}
}
