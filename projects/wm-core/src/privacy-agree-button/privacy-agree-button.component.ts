import {Component, Input, Output, EventEmitter} from '@angular/core';
import {Observable} from 'rxjs';
import {take, switchMap} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {confPRIVACY} from '@wm-core/store/conf/conf.selector';
import {PrivacyAgreeService} from '@wm-core/services/privacy-agree.service';
import {IPROJECT} from '@wm-core/types/config';

@Component({
  selector: 'wm-privacy-agree-button',
  templateUrl: './privacy-agree-button.component.html',
  styleUrls: ['./privacy-agree-button.component.scss'],
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

  @Output() consentResultEVT = new EventEmitter<boolean>();

  isLogged$: Observable<boolean> = this._store.select(isLogged);
  confPRIVACY$: Observable<IPROJECT> = this._store.select(confPRIVACY);

  private _isAlertOpen: boolean = false;

  constructor(private _store: Store, private _privacyAgreeSvc: PrivacyAgreeService) {}

  /**
   * Open privacy agree alert to allow user to modify privacy consent
   */
  openPrivacyAgreeAlert(): void {
    if (this.disabled || this._isAlertOpen) {
      return;
    }

    this._isAlertOpen = true;
    this._privacyAgreeSvc.setManualAlertOpen(true);

    this.isLogged$
      .pipe(
        take(1),
        switchMap(isLogged =>
          this._privacyAgreeSvc.showPrivacyAgreeAlert(isLogged, this.confPRIVACY$),
        ),
      )
      .subscribe({
        next: result => {
          this.consentResultEVT.emit(result);
          this._isAlertOpen = false;
          this._privacyAgreeSvc.setManualAlertOpen(false);
        },
        error: error => {
          this._isAlertOpen = false;
          this._privacyAgreeSvc.setManualAlertOpen(false);
        },
        complete: () => {
          this._isAlertOpen = false;
          this._privacyAgreeSvc.setManualAlertOpen(false);
        },
      });
  }
}
