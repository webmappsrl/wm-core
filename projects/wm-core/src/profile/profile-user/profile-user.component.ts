import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {IUser} from '@wm-core/store/auth/auth.model';
import {isLogged, user} from '@wm-core/store/auth/auth.selectors';
import {confAUTHEnable} from '@wm-core/store/conf/conf.selector';

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
  avatarUrl: string;
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  user$: Observable<IUser> = this._store.pipe(select(user));

  constructor(private _store: Store) {}
}
