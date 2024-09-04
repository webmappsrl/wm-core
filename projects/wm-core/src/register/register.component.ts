import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {
  AbstractControl,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {LoadingController, ModalController, NavController, PopoverController} from '@ionic/angular';
import {select, Store} from '@ngrx/store';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {filter, map, switchMap, take} from 'rxjs/operators';
import {GenericPopoverComponent} from 'wm-core/generic-popover/generic-popover.component';
import {WmInnerHtmlComponent} from 'wm-core/inner-html/inner-html.component';
import {LangService} from 'wm-core/localization/lang.service';
import {loadSignUps} from 'wm-core/store/auth/auth.actions';
import {selectAuthState} from 'wm-core/store/auth/auth.selectors';
import {confPAGES, confPRIVACY} from 'wm-core/store/conf/conf.selector';

@Component({
  selector: 'wm-register-component',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [LangService],
})
export class RegisterComponent {
  get errorControl() {
    return this.registerForm.controls;
  }

  @Input() referrer: string;

  checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    let pass = group.get('password').value;
    let confirmPass = group.get('confirmPassword').value;
    return pass === confirmPass ? null : {notSame: true};
  };
  confPages$: Observable<any>;
  confPrivacy$: Observable<any>;
  isValid$: Observable<boolean> = of(false);
  loadingString = '';
  registerForm: UntypedFormGroup;
  showError = false;
  submitted$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _formBuilder: UntypedFormBuilder,
    private _navCtrl: NavController,
    private _popoverCtrl: PopoverController,
    private _loadingCtrl: LoadingController,
    private _modalCtrl: ModalController,
    private _langSvc: LangService,
    private _store: Store<any>,
  ) {
    this.registerForm = this._formBuilder.group(
      {
        name: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]],
      },
      {validators: this.checkPasswords},
    );
    this.isValid$ = this.registerForm.statusChanges.pipe(map(status => status === 'VALID'));
    this.confPrivacy$ = this._store.select(confPRIVACY);
    this.confPages$ = this._store.select(confPAGES);
  }

  back(): void {
    this._navCtrl.back();
  }

  dismiss(): void {
    this._modalCtrl.dismiss();
  }

  openCmp(privacy: any): void {
    from(
      this._modalCtrl.create({
        component: WmInnerHtmlComponent,
        componentProps: {
          html: privacy.html,
        },
        swipeToClose: true,
        mode: 'ios',
      }),
    )
      .pipe(take(1))
      .subscribe(modal => modal.present());
  }

  register(): void {
    const loader$ = from(
      this._loadingCtrl.create({
        message: this._langSvc.instant("Registrazione in corso"),
      }),
    );
    const present$ = loader$.pipe(switchMap(l => from(l.present())));
    const dismiss$ = loader$.pipe(switchMap(l => from(l.dismiss())));
    present$
      .pipe(
        switchMap(() => this._store.pipe(select(selectAuthState))),
        filter(state => state !== null),
        take(1),
        switchMap(() => dismiss$),
      )
      .subscribe(() => {});
    this._store.dispatch(
      loadSignUps({
        name: this.registerForm.get('name').value,
        email: this.registerForm.get('email').value,
        password: this.registerForm.get('password').value,
        referrer: this.referrer,
      }),
    );
  }

  async showCfInfo(ev): Promise<void> {
    const popover = await this._popoverCtrl.create({
      component: GenericPopoverComponent,
      event: ev,
      translucent: true,
      componentProps: {
        title: this._langSvc.instant("Perchè ti chiediamo il Codice Fiscale?"),
        message: this._langSvc.instant("Se sei Socia/o CAI inserisci il tuo CF al momento della registrazione. Per te il download delle tappe del Sentiero Italia CAI sarà automaticamente gratuito!"),
      },
    });
    return popover.present();
  }
}
