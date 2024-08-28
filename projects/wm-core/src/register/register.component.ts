import {Component, Input} from '@angular/core';
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
  providers: [LangService],
})
export class RegisterComponent {
  // private cfregex =
  //   '/^(?:[A-Z][AEIOU][AEIOUX]|[B-DF-HJ-NP-TV-Z]{2}[A-Z]){2}(?:[dLMNP-V]{2}(?:[A-EHLMPR-T](?:[04LQ][1-9MNP-V]|[15MR][dLMNP-V]|[26NS][0-8LMNP-U])|[DHPS][37PT][0L]|[ACELMRT][37PT][01LM]|[AC-EHLMPR-T][26NS][9V])|(?:[02468LNQSU][048LQU]|[13579MPRTV][26NS])B[26NS][9V])(?:[A-MZ][1-9MNP-V][dLMNP-V]{2}|[A-M][0L](?:[1-9MNP-V][dLMNP-V]|[0L][1-9MNP-V]))[A-Z]$/i';

  get errorControl() {
    return this.registerForm.controls;
  }

  checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    let pass = group.get('password').value;
    let confirmPass = group.get('confirmPassword').value;
    return pass === confirmPass ? null : {notSame: true};
  };
  public confPages$: Observable<any>;
  public confPrivacy$: Observable<any>;
  submitted$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public loadingString = '';
  public registerForm: UntypedFormGroup;
  public showError = false;
  isValid$: Observable<boolean> = of(false);

  @Input() referrer: string;

  constructor(
    private _navCtrl: NavController,
    private _formBuilder: UntypedFormBuilder,
    private _popoverCtrlr: PopoverController,
    private _loadingCtrl: LoadingController,
    private _langSvc: LangService,
    private _store: Store<any>,
    private _modalCtrl: ModalController,
  ) {
    this.registerForm = this._formBuilder.group(
      {
        name: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        //cf: ['', [Validators.pattern(this.cfregex),]],
        password: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]],
      },
      {validators: this.checkPasswords},
    );
    this.isValid$ = this.registerForm.statusChanges.pipe(map(status => status === 'VALID'));
    this.confPrivacy$ = this._store.select(confPRIVACY);
    this.confPages$ = this._store.select(confPAGES);
  }

  back() {
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

  register() {
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

  async showCfInfo(ev) {
    const popover = await this._popoverCtrlr.create({
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
