import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import * as AuthActions from './auth.actions';
import {catchError, map, switchMap} from 'rxjs/operators';
import {AuthService} from './auth.service';
import {of} from 'rxjs';
import {NavController} from '@ionic/angular';

@Injectable()
export class AuthEffects {
  loadSignup$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadSignUps),
      switchMap(action =>
        this._authSvc.signUp(action.name, action.email, action.password, action.referrer).pipe(
          map(user => {
            return AuthActions.loadSignUpsSuccess({user});
          }),
          catchError(error => {
            return of(AuthActions.loadSignUpsFailure({error}));
          }),
        ),
      ),
    );
  });

  loadSignin$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadSignIns),
      switchMap(action =>
        this._authSvc.login(action.email, action.password).pipe(
          map(user => {
            return AuthActions.loadSignInsSuccess({user});
          }),
          catchError(error => {
            return of(AuthActions.loadSignInsFailure({error}));
          }),
        ),
      ),
    );
  });

  loadAuth$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadAuths),
      switchMap(action =>
        this._authSvc.getUser().pipe(
          map(user => {
            return AuthActions.loadAuthsSuccess({user});
          }),
          catchError(error => {
            return of(AuthActions.loadAuthsFailure({error}));
          }),
        ),
      ),
    );
  });

  logout$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadSignOuts),
      switchMap(action =>
        this._authSvc.logout().pipe(
          map(_ => {
            return AuthActions.loadSignOutsSuccess();
          }),
          catchError(error => {
            return of(AuthActions.loadSignOutsFailure({error}));
          }),
        ),
      ),
    );
  });

  deleteUser$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.deleteUser),
      switchMap(action =>
        this._authSvc.delete().pipe(
          map(user => {
            return AuthActions.deleteUserSuccess();
          }),
          catchError(error => {
            return of(AuthActions.deleteUserFailure({error}));
          }),
        ),
      ),
    );
  });

  navigateToHome$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(AuthActions.loadSignUpsSuccess),
        map(() => this._navCtrl.navigateForward('home')),
      ),
    {dispatch: false},
  );

  constructor(
    private _actions$: Actions,
    private _authSvc: AuthService,
    private _navCtrl: NavController,
  ) {}
}
