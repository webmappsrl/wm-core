import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {from, Observable} from 'rxjs';
import {IUser, Privacy} from './auth.model';
import {Store} from '@ngrx/store';
import {IAPP} from '@wm-core/types/config';
import {confAPP, confPRIVACY} from '@wm-core/store/conf/conf.selector';
import {switchMap, take} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {AlertController, ModalController} from '@ionic/angular';
import {updateUserPrivacy} from './auth.actions';
import {WmInnerHtmlComponent} from '@wm-core/inner-html/inner-html.component';
import {DEFAULT_PRIVACY_POLICY_URL} from '@wm-core/constants/links';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  confAPP$: Observable<IAPP> = this._store.select(confAPP);
  constructor(
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
    private _store: Store,
    private _langSvc: LangService,
    private _alertCtrl: AlertController,
    private _modalCtrl: ModalController,
  ) {}

  login(email: string, password: string, referrer?: string): Observable<IUser> {
    return this.confAPP$.pipe(
      take(1),
      switchMap(confApp => {
        const sku = confApp.sku;
        const appId = confApp.id ?? confApp.geohubId;
        email = email?.toLowerCase();

        return this._http.post(`${this._environmentSvc.origin}/api/auth/login`, {
          email,
          password,
          sku,
          appId,
        }) as Observable<IUser>;
      }),
    );
  }

  me(): Observable<IUser> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/me`, {}) as Observable<IUser>;
  }

  logout(): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/logout`, {}) as Observable<any>;
  }

  signUp(name: string, email: string, password: string): Observable<IUser> {
    return this.confAPP$.pipe(
      take(1),
      switchMap(confApp => {
        const sku = confApp.sku;
        const appId = confApp.id ?? confApp.geohubId;
        email = email?.toLowerCase();
        const privacy: Privacy = {
          agree: true,
          date: new Date().toISOString(),
          app_id: +appId,
        };
        return this._http.post(`${this._environmentSvc.origin}/api/auth/signup`, {
          name,
          email,
          password,
          sku,
          privacy,
        }) as Observable<IUser>;
      }),
    );
  }

  delete(): Observable<any> {
    return this._http.post(`${this._environmentSvc.origin}/api/auth/delete`, {}) as Observable<any>;
  }

  updatePrivacyAgree(agree: boolean): Observable<IUser> {
    return this.confAPP$.pipe(
      take(1),
      switchMap(confApp => {
        const appId = confApp.id ?? confApp.geohubId;
        const privacy: Privacy = {
          agree,
          date: new Date().toISOString(),
          app_id: +appId,
        };

        return this._http.post(`${this._environmentSvc.origin}/api/auth/user`, {
          privacy,
        }) as Observable<IUser>;
      }),
    );
  }

  /**
   * Show privacy agree alert and handle user response
   * @returns Observable that emits when the alert is dismissed
   */
  showPrivacyAgreeAlert(): Observable<any> {
    return new Observable(observer => {
      // Use translations
      const title = this._langSvc.instant('privacy.agree.title');
      const message = this._langSvc.instant('privacy.agree.message');
      const readPrivacy = this._langSvc.instant('privacy.agree.read_privacy');
      const accept = this._langSvc.instant('privacy.agree.accept');
      const reject = this._langSvc.instant('privacy.agree.reject');

      this._alertCtrl
        .create({
          header: title,
          message: message,
          backdropDismiss: false,
          buttons: [
            {
              text: readPrivacy,
              handler: () => {
                this._openPrivacyPolicy().subscribe({
                  next: () => {},
                  error: error => {},
                });
                return false; // lascia aperto l’alert principale
              },
            },
            {
              text: accept,
              handler: () => {
                this._alertCtrl.dismiss().then(async () => {
                  await this._openConfirmAndDispatch(true);
                });
                return true; // chiude il primo alert
              },
            },
            {
              text: reject,
              role: 'cancel',
              handler: () => {
                this._alertCtrl.dismiss().then(async () => {
                  await this._openConfirmAndDispatch(false);
                });
                return true; // chiude il primo alert
              },
            },
          ],
        })
        .then(alert => {
          alert.present();
        });
    });
  }
  private async _openConfirmAndDispatch(accepted: boolean): Promise<void> {
    const confirmTitle = this._langSvc.instant('privacy.agree.confirm.title');
    const confirmMessage = accepted
      ? this._langSvc.instant('privacy.agree.confirm.accept_message')
      : this._langSvc.instant('privacy.agree.confirm.reject_message');
    const confirmYes = this._langSvc.instant('privacy.agree.confirm.yes');
    const confirmNo = this._langSvc.instant('privacy.agree.confirm.no');

    const confirmAlert = await this._alertCtrl.create({
      header: confirmTitle,
      message: confirmMessage,
      backdropDismiss: false,
      buttons: [
        {text: confirmNo, role: 'cancel'},
        {text: confirmYes, role: 'confirm'},
      ],
    });

    await confirmAlert.present();
    const {role} = await confirmAlert.onDidDismiss();

    if (role === 'confirm') {
      // accepted === true -> agree: true ; accepted === false -> agree: false
      this._store.dispatch(updateUserPrivacy({agree: accepted}));
    }
  }

  /**
   * Open privacy policy modal or external link
   */
  private _openPrivacyPolicy(): Observable<any> {
    return this._store.select(confPRIVACY).pipe(
      take(1),
      switchMap(privacy => {
        if (privacy?.html != null) {
          return from(
            this._modalCtrl.create({
              component: WmInnerHtmlComponent,
              componentProps: {
                html: privacy.html,
              },
              canDismiss: true,
              mode: 'ios',
            }),
          ).pipe(
            switchMap(modal => {
              if (modal) {
                return from(modal.present());
              }
              return from(Promise.resolve(null));
            }),
          );
        } else {
          // Fallback se non c'è contenuto HTML nella configurazione
          window.open(DEFAULT_PRIVACY_POLICY_URL, '_blank');
          return from(Promise.resolve(null));
        }
      }),
    );
  }
}
