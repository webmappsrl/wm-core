import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {Observable} from 'rxjs';
import {take, switchMap, filter} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {isLogged, privacyUser} from '@wm-core/store/auth/auth.selectors';
import {confPRIVACY} from '@wm-core/store/conf/conf.selector';
import {IPROJECT} from '@wm-core/types/config';
import {Privacy} from '@wm-core/store/auth/auth.model';
import {AuthService} from '@wm-core/store/auth/auth.service';

@Component({
  selector: 'wm-privacy-agree-button',
  templateUrl: './privacy-agree-button.component.html',
  styleUrls: ['./privacy-agree-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPrivacyAgreeButtonComponent {
  @Input() size: 'small' | 'default' | 'large' = 'small';
  @Input() expand: 'full' | 'block' | null = 'block';
  @Input() fill: 'clear' | 'outline' | 'solid' = 'outline';
  @Input() color: string = 'primary';
  @Input() cssClass: string = 'wm-privacy-agree-button';
  @Input() iconName: string = 'shield-outline';
  @Input() showIcon: boolean = true;
  @Input() disabled: boolean = false;


  isLogged$: Observable<boolean> = this._store.select(isLogged);
  confPRIVACYPAGE$: Observable<IPROJECT> = this._store.select(confPRIVACY);
  privacyUser$: Observable<Privacy> = this._store.select(privacyUser);


  constructor(
    private _store: Store,
    private _authSvc: AuthService,
  ) {}

  /**
   * Open privacy agree alert to allow user to modify privacy consent
   */
  openPrivacyAgreeAlert(): void {
    this.isLogged$
      .pipe(
        take(1),
        filter(l=>l),
        switchMap(isLogged => this._authSvc.showPrivacyAgreeAlert()),
      )
      .subscribe();
  }


}
