import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {loadIcons, loadIconsFail, loadIconsSuccess} from './icons.actions';
import {catchError, map, switchMap} from 'rxjs/operators';
import {IconsService} from './icons.service';
import {of} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IconsEffects {
  loadIcons$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadIcons),
      switchMap(() => this._iconsSVC.getIcons()),
      map(icons => loadIconsSuccess({icons})),
      catchError(() => of(loadIconsFail())),
    ),
  );

  constructor(private _actions$: Actions, private _iconsSVC: IconsService) {}
}
