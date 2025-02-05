import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {IonInput, ModalController} from '@ionic/angular';
import {select, Store} from '@ngrx/store';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {loadSignIns} from '@wm-core/store/auth/auth.actions';
import {isLogged} from '@wm-core/store/auth/auth.selectors';

@Component({
  selector: 'wm-login-component',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LoginComponent implements OnInit {
  get errorControl() {
    return this.loginForm.controls;
  }

  @ViewChild('email') emailField: IonInput;
  @ViewChild('password') passwordField: IonInput;

  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  loginForm: UntypedFormGroup;
  showPassword$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  submitted$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _formBuilder: UntypedFormBuilder,
    private _modalCtrl: ModalController,
    private _store: Store,
  ) {
    this.loginForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.setFocus();
    }, 1000);

    this.isLogged$
      .pipe(
        filter(l => l),
        take(1),
      )
      .subscribe(() => {
        this.dismiss();
      });
  }

  dismiss(): void {
    this._modalCtrl.dismiss();
  }

  forgotPassword(): void {}

  login(): void {
    this.submitted$.next(true);
    if (this.loginForm.valid) {
      this._store.dispatch(loadSignIns(this.loginForm.value));
    }
  }

  openUrl(url: string): void {
    window.open(url, '_blank');
  }

  setFocus(): void {
    this.emailField.setFocus();
  }

  togglePasswordVisibility(): void {
    this.showPassword$.next(!this.showPassword$.getValue());
  }
}
