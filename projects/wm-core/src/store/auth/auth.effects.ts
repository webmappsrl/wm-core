import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import * as AuthActions from './auth.actions';
import {catchError, filter, map, switchMap, tap} from 'rxjs/operators';
import {AuthService} from './auth.service';
import {of} from 'rxjs';
import {AlertController, NavController} from '@ionic/angular';
import {LangService} from 'wm-core/localization/lang.service';

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

  openAlertSignOutSuccess$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(AuthActions.loadSignOutsSuccess),
        switchMap(() =>
          this._alertCtrl.create({
            mode: 'ios',
            header: this._langSvc.instant('Logout effettuato con successo'),
            message: '',
            buttons: [
              {
                text: 'ok',
              },
            ],
          }),
        ),
        switchMap(alert => {
          alert.present();
          return alert.onWillDismiss();
        }),
      ),
    {dispatch: false},
  );

  openAlertSignInSuccess$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(AuthActions.loadSignInsSuccess),
        switchMap(() =>
          this._alertCtrl.create({
            mode: 'ios',
            header: this._langSvc.instant('Login effettuato con successo'),
            message: '',
            buttons: [
              {
                text: 'ok',
              },
            ],
          }),
        ),
        switchMap(alert => {
          alert.present();
          return alert.onWillDismiss();
        }),
      ),
    {dispatch: false},
  );

  openAlertOnError$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          AuthActions.loadSignInsFailure,
          AuthActions.loadSignUpsFailure,
          AuthActions.loadAuthsFailure,
        ),
        filter(r => r != null && r.error.error.error != 'Unauthorized'),
        switchMap((resposne) => {
          const error = resposne.error.error;
          return this._alertCtrl.create({
            mode: 'ios',
            header: this._langSvc.instant(error),
            message: '',
            buttons: [
              {
                text: 'ok',
              },
            ],
          })
        }),
        switchMap(alert => {
          alert.present();
          return alert.onWillDismiss();
        }),
      ),
    {dispatch: false},
  );

  constructor(
    private _actions$: Actions,
    private _authSvc: AuthService,
    private _navCtrl: NavController,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
  ) {}
}
