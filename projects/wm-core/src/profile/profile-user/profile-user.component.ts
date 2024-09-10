import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { select, Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { from, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { deleteUser } from 'wm-core/store/auth/auth.actions';
import { IUser } from 'wm-core/store/auth/auth.model';
import { isLogged, user } from 'wm-core/store/auth/auth.selectors';
import { confAUTHEnable } from 'wm-core/store/conf/conf.selector';

@Component({
  selector: 'wm-profile-user',
  templateUrl: './profile-user.component.html',
  styleUrls: ['./profile-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileUserComponent {
  authEnable$: Observable<boolean> = this._store.select(confAUTHEnable);
  avatarUrl: string;
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  user$: Observable<IUser> = this._store.pipe(select(user));

  constructor(
    private _store: Store,
    private _alertCtrl: AlertController,
    private _tranlateSvc: TranslateService,
  ) {}

  deleteUserAlert(): void {
    from(
      this._alertCtrl.create({
        header: this._tranlateSvc.instant('Attenzione'),
        subHeader: this._tranlateSvc.instant('Azione irreversibile'),
        message: this._tranlateSvc.instant('Vuoi veramente eliminare il tuo account?'),
        buttons: [
          {
            text: this._tranlateSvc.instant('Annulla'),
            role: 'cancel',
            handler: () => {
              window.alert('cancel');
            },
          },
          {
            text: this._tranlateSvc.instant('elimina'),
            role: 'confirm',
            handler: () => {
              this._store.dispatch(deleteUser());
            },
          },
        ],
      }),
    )
      .pipe(take(1))
      .subscribe(l => {
        l.present();
      });
  }
}
