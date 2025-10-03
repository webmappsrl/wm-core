import {Component, Input, Output, EventEmitter, OnInit, OnDestroy} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {confAPP} from '@wm-core/store/conf/conf.selector';
import {PrivacyAgreeService} from '@wm-core/services/privacy-agree.service';
import {IAPP} from '@wm-core/types/config';

@Component({
  selector: 'wm-privacy-agree-button',
  templateUrl: './privacy-agree-button.component.html',
  styleUrls: ['./privacy-agree-button.component.scss'],
})
export class WmPrivacyAgreeButtonComponent implements OnInit, OnDestroy {
  @Input() size: 'small' | 'default' | 'large' = 'small';
  @Input() expand: 'full' | 'block' | null = 'block';
  @Input() fill: 'clear' | 'outline' | 'solid' = 'outline';
  @Input() color: string = 'primary';
  @Input() cssClass: string = 'wm-privacy-agree-button';
  @Input() iconName: string = 'shield-outline';
  @Input() showIcon: boolean = true;
  @Input() disabled: boolean = false;

  @Output() consentResult = new EventEmitter<boolean>();

  isLogged$: Observable<boolean> = this._store.select(isLogged);
  confAPP$: Observable<IAPP> = this._store.select(confAPP);

  private _subscription: Subscription = new Subscription();
  private _isAlertOpen: boolean = false;

  constructor(private _store: Store, private _privacyAgreeSvc: PrivacyAgreeService) {}

  ngOnInit(): void {
    // Component initialization if needed
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  /**
   * Open privacy agree alert to allow user to modify privacy consent
   */
  openPrivacyAgreeAlert(): void {
    if (this.disabled || this._isAlertOpen) {
      return;
    }

    this._isAlertOpen = true;
    this._privacyAgreeSvc.setManualAlertOpen(true);

    // Clear any existing subscriptions to prevent multiple alerts
    this._subscription.unsubscribe();
    this._subscription = new Subscription();

    this._subscription.add(
      this.isLogged$.pipe(take(1)).subscribe(isLogged => {
        this._subscription.add(
          this._privacyAgreeSvc.showPrivacyAgreeAlert(isLogged, this.confAPP$).subscribe({
            next: result => {
              console.log('Privacy agree result:', result);
              this.consentResult.emit(result);
              this._isAlertOpen = false;
              this._privacyAgreeSvc.setManualAlertOpen(false);
            },
            error: error => {
              console.error('Privacy agree error:', error);
              this._isAlertOpen = false;
              this._privacyAgreeSvc.setManualAlertOpen(false);
            },
            complete: () => {
              this._isAlertOpen = false;
              this._privacyAgreeSvc.setManualAlertOpen(false);
            },
          }),
        );
      }),
    );
  }
}
