import {Component, Input} from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import {select, Store} from '@ngrx/store';
import {from, Observable, of} from 'rxjs';
import { concatMap, switchMap } from 'rxjs/operators';
import { LoginComponent } from 'wm-core/login/login.component';
import { RegisterComponent } from 'wm-core/register/register.component';
import {isLogged} from 'wm-core/store/auth/auth.selectors';

@Component({
  selector: 'wm-profile-auth',
  templateUrl: './profile-auth.component.html',
  styleUrls: ['./profile-auth.component.scss'],
})
export class ProfileAuthComponent {
  @Input() slide1: string;
  @Input() slide2: string;

  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  loggedOutSliderOptions: any;

  constructor(
    private _store: Store,
    private _modalCtrl: ModalController,
    private _navCtrl: NavController
  ) {
    this.loggedOutSliderOptions = {
      initialSlide: 0,
      speed: 400,
      spaceBetween: 10,
      slidesOffsetAfter: 0,
      slidesOffsetBefore: 0,
      slidesPerView: 1,
    };
  }

  login(): void {
    from(this._modalCtrl.getTop()).pipe(
      concatMap((modal) =>
        modal ? from(this._modalCtrl.dismiss()) : of(null)
      ),
      switchMap(() =>
        from(this._modalCtrl.create({
          component: LoginComponent,
          swipeToClose: true,
          mode: 'ios',
          id: 'webmapp-login-modal',
        }))
      ),
      concatMap((modal) => from(modal.present()))
    ).subscribe();
  }

  signup(): void {
    from(this._modalCtrl.getTop()).pipe(
      concatMap((modal) =>
        modal ? from(this._modalCtrl.dismiss()) : of(null)
      ),
      switchMap(() =>
        from(this._modalCtrl.create({
          component: RegisterComponent,
          swipeToClose: true,
          mode: 'ios',
          id: 'webmapp-login-modal',
        }))
      ),
      concatMap((modal) => from(modal.present()))
    ).subscribe();
  }
}
