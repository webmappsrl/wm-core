import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import * as AuthActions from './auth.actions';
import {catchError, filter, map, switchMap} from 'rxjs/operators';
import {AuthService} from './auth.service';
import {from, of} from 'rxjs';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {UgcService} from '@wm-core/store/features/ugc/ugc.service';
import {clearUgcData} from '@wm-core/utils/localForage';
import {Store} from '@ngrx/store';
import {closeUgc} from '../user-activity/user-activity.action';

@Injectable()
export class AuthEffects {
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
  logout$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadSignOuts),
      switchMap(action =>
        this._authSvc.logout().pipe(
          switchMap(async () => {
            this._store.dispatch(closeUgc());
            await clearUgcData();
            return AuthActions.loadSignOutsSuccess();
          }),
          catchError(error => {
            return of(AuthActions.loadSignOutsFailure({error}));
          }),
        ),
      ),
    );
  });
  openAlertOnError$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          AuthActions.loadSignInsFailure,
          AuthActions.loadSignUpsFailure,
          AuthActions.loadAuthsFailure,
        ),
        filter(r => r != null && r.error.error.error != 'Unauthorized'),
        switchMap(e => {
          return this._createErrorAlert(this._langSvc.instant(e.error.error));
        }),
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
        switchMap(() => {
          return this._createMessageAlert(this._langSvc.instant('Login effettuato con successo'));
        }),
        switchMap(alert => {
          alert.present();
          return alert.onWillDismiss();
        }),
      ),
    {dispatch: false},
  );
  openAlertSignOutSuccess$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(AuthActions.loadSignOutsSuccess),
        switchMap(() =>
          this._createMessageAlert(this._langSvc.instant('Logout effettuato con successo')),
        ),
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
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
    private _store: Store,
  ) {}

  private _createErrorAlert(error: string): Promise<HTMLIonAlertElement> {
    return this._alertCtrl.create({
      mode: 'ios',
      header: this._langSvc.instant('Ops!'),
      message: error,
      buttons: [
        {
          text: 'ok',
        },
      ],
    });
  }

  private _createMessageAlert(message: string): Promise<HTMLIonAlertElement> {
    return this._alertCtrl.create({
      mode: 'ios',
      message,
      buttons: [
        {
          text: 'ok',
        },
      ],
    });
  }
}
