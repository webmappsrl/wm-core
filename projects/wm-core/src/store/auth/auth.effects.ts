import {from, of} from 'rxjs';

import {syncUgc} from '../features/ugc/ugc.actions';
import {closeUgc} from '../user-activity/user-activity.action';
import * as AuthActions from './auth.actions';
import {AuthService} from './auth.service';
import {Injectable} from '@angular/core';
import {AlertController} from '@ionic/angular';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {
  clearUgcDeviceData,
  clearUgcSynchronizedData,
  getAuth,
  removeAuth,
  saveAuth,
} from '@wm-core/utils/localForage';
import {catchError, filter, map, switchMap} from 'rxjs/operators';

@Injectable()
export class AuthEffects {
  deleteUser$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.deleteUser),
      switchMap(action =>
        this._authSvc.delete().pipe(
          map(user => {
            this._clearUserData(true);
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
            saveAuth(user);
            return AuthActions.loadAuthsSuccess({user});
          }),
          catchError(error => {
            console.log('error', error);
            if (error?.status === 401) {
              return of(AuthActions.loadAuthsFailure({error}));
            }
            return from(getAuth()).pipe(
              map(user => {
                if (user) {
                  return AuthActions.loadAuthsSuccess({user});
                }
                return AuthActions.loadAuthsFailure({error});
              }),
            );
          }),
        ),
      ),
    );
  });
  loadSignin$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadSignIns),
      switchMap(action =>
        this._authSvc.login(action.email?.toLowerCase(), action.password).pipe(
          map(user => {
            saveAuth(user);
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
        this._authSvc.signUp(action.name, action.email?.toLowerCase(), action.password).pipe(
          map(user => {
            saveAuth(user);
            return AuthActions.loadSignUpsSuccess({user});
          }),
          catchError(error => {
            return of(AuthActions.loadSignUpsFailure({error}));
          }),
        ),
      ),
    );
  });
  logoutByError$ = createEffect(
    () => {
      return this._actions$.pipe(
        ofType(AuthActions.loadAuthsFailure),
        switchMap(async action => await this._clearUserData()),
      );
    },
    {dispatch: false},
  );
  logout$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(AuthActions.loadSignOuts),
      switchMap(action =>
        this._authSvc.logout().pipe(
          switchMap(async () => {
            return this._logout();
          }),
          catchError(error => {
            return this._logout();
          }),
        ),
      ),
    );
  });
  openAlertOnError$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(AuthActions.loadSignInsFailure, AuthActions.loadSignUpsFailure),
        filter(r => r != null && r.error?.error?.error != 'Unauthorized'),
        switchMap(e => {
          const errorMessage = e.error?.error?.error ?? 'Errore';
          return this._createErrorAlert(this._langSvc.instant(errorMessage));
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
        switchMap(_ => {
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

  private async _logout(): Promise<Action> {
    await this._clearUserData();
    return AuthActions.loadSignOutsSuccess();
  }

  private async _clearUserData(clearDeviceData: boolean = false): Promise<void> {
    this._store.dispatch(closeUgc());
    await clearUgcSynchronizedData();
    if (clearDeviceData) {
      await clearUgcDeviceData();
    }
    await removeAuth();
    this._store.dispatch(syncUgc());
  }
}
