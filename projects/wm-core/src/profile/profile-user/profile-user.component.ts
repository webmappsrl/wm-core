import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {from, Observable} from 'rxjs';
import {IUser} from '@wm-core/store/auth/auth.model';
import {isLogged, user} from '@wm-core/store/auth/auth.selectors';
import {confAUTHEnable} from '@wm-core/store/conf/conf.selector';
import {ModalController} from '@ionic/angular';
import {ProfileEditComponent} from '@wm-core/profile/profile-edit/profile-edit.component';

@Component({
  standalone: false,
  selector: 'wm-profile-user',
  templateUrl: './profile-user.component.html',
  styleUrls: ['./profile-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileUserComponent {
  authEnable$: Observable<boolean> = this._store.select(confAUTHEnable);
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  user$: Observable<IUser> = this._store.pipe(select(user));

  constructor(
    private _store: Store,
    private _modalCtrl: ModalController,
  ) {}

  /**
   * Apre la modale di modifica profilo (`ProfileEditComponent`), precompilandola con
   * i valori correnti dell'utente passati come `@Input`.
   *
   * @param currentUser utente corrente, letto dal template da `user$|async`
   */
  openEditProfile(currentUser: IUser): void {
    from(
      this._modalCtrl.create({
        component: ProfileEditComponent,
        componentProps: {
          currentName: currentUser?.name,
          currentSurname: currentUser?.surname,
          currentAvatarUrl: currentUser?.avatar_url,
        },
        canDismiss: true,
        mode: 'ios',
        id: 'wm-profile-edit-modal',
      }),
    ).subscribe(modal => modal.present());
  }
}
