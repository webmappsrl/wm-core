import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {select, Store} from '@ngrx/store';
import {from, Observable, of} from 'rxjs';
import {concatMap, switchMap} from 'rxjs/operators';
import {LoginComponent} from '@wm-core/login/login.component';
import {RegisterComponent} from '@wm-core/register/register.component';
import {isLogged} from '@wm-core/store/auth/auth.selectors';

@Component({
  standalone: false,
  selector: 'wm-profile-auth',
  templateUrl: './profile-auth.component.html',
  styleUrls: ['./profile-auth.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileAuthComponent {
  @Input() slide1: string;
  @Input() slide2: string;

  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  loggedOutSliderOptions: any;

  constructor(private _store: Store, private _modalCtrl: ModalController) {
    this.loggedOutSliderOptions = {
      initialSlide: 0,
      speed: 400,
      spaceBetween: 10,
      slidesOffsetAfter: 0,
      slidesOffsetBefore: 0,
      slidesPerView: 1,
      pagination: {
        enabled: true,
      },
    };
  }

  login(): void {
    from(this._modalCtrl.getTop())
      .pipe(
        concatMap(modal => (modal ? from(this._modalCtrl.dismiss()) : of(null))),
        switchMap(() =>
          from(
            this._modalCtrl.create({
              component: LoginComponent,
              canDismiss: true,
              mode: 'ios',
              id: 'webmapp-login-modal',
            }),
          ),
        ),
        concatMap(modal => from(modal.present())),
      )
      .subscribe();
  }

  signup(): void {
    from(this._modalCtrl.getTop())
      .pipe(
        concatMap(modal => (modal ? from(this._modalCtrl.dismiss()) : of(null))),
        switchMap(() =>
          from(
            this._modalCtrl.create({
              component: RegisterComponent,
              canDismiss: true,
              mode: 'ios',
              id: 'webmapp-login-modal',
            }),
          ),
        ),
        concatMap(modal => from(modal.present())),
      )
      .subscribe();
  }
}
