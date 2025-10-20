import {Injectable} from '@angular/core';
import {AlertController, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {DEFAULT_PRIVACY_POLICY_URL} from '@wm-core/constants/links';
import {WmInnerHtmlComponent} from '@wm-core/inner-html/inner-html.component';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {AuthService} from '@wm-core/store/auth/auth.service';
import {IUser} from '@wm-core/store/auth/auth.model';
import {confAPP, confPRIVACY} from '@wm-core/store/conf/conf.selector';
import {IAPP, IPROJECT} from '@wm-core/types/config';
import {loadAuthsSuccess} from '@wm-core/store/auth/auth.actions';

import {BehaviorSubject, Observable, from, Subject} from 'rxjs';

import {filter, switchMap, take} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PrivacyAgreeService {
  private privacyAgreeSubject = new BehaviorSubject<boolean>(this._hasPrivacyAgreeInLocalStorage());
  private isManualAlertOpen = false;

  private privacyAgreeAcceptedSubject = new Subject<void>();
  public privacyAgreeAccepted$ = this.privacyAgreeAcceptedSubject.asObservable();

  public confAPP$: Observable<IAPP> = this._store.select(confAPP);
  public privacyAgree$ = this.privacyAgreeSubject.asObservable();
  public isLogged$: Observable<boolean> = this._store.select(isLogged);
  public needsPrivacyAgree$: Observable<boolean> = this._store.select(needsPrivacyAgree);

  constructor(
    private _alertCtrl: AlertController,
    private _modalCtrl: ModalController,
    private _store: Store,
    private _authSvc: AuthService,
    private _langSvc: LangService,
  ) {}

  /**
   * Save privacy agree during signup (no confirmation needed)
   * @param privacyAgree Whether user accepted privacy agree
   * @param isLoggedIn Whether the user is currently logged in
   */
  public savePrivacyAgreeForSignup(privacyAgree: boolean, isLoggedIn: boolean): void {
    this._savePrivacyAgree(privacyAgree, isLoggedIn, true);
  }

  /**
   * Set manual alert open status to prevent automatic alerts
   */
  public setManualAlertOpen(isOpen: boolean): void {
    this.isManualAlertOpen = isOpen;
  }

  /**
   * Initialize privacy agree management - call this from app component
   */
  public initializePrivacyAgreeManagement(): void {
    // Force sync privacy agree from backend on app startup if user is already logged in
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      if (isLogged) {
        this._syncPrivacyAgreeFromBackendAndWait();
      } else {
        // If user is not logged in, check privacy agree normally
        this._checkPrivacyAgreeAfterDelay();
      }
    });

    // Update privacy agree status when user logs in
    this.isLogged$.pipe(filter(isLogged => isLogged)).subscribe(() => {
      // Sync privacy agree from backend and update status after a small delay to ensure user is fully logged in
      setTimeout(() => {
        this._syncPrivacyAgreeFromBackend();
      }, 100);
    });
  }

  /**
   * Open privacy policy modal or external link
   */
  public openPrivacyPolicy(): Observable<any> {
    return this._store.select(confPRIVACY).pipe(
      take(1),
      switchMap(privacy => {
        if (privacy?.html != null) {
          return from(
            this._modalCtrl.create({
              component: WmInnerHtmlComponent,
              componentProps: {
                html: privacy.html,
              },
              canDismiss: true,
              mode: 'ios',
            }),
          ).pipe(
            switchMap(modal => {
              if (modal) {
                return from(modal.present());
              }
              return from(Promise.resolve(null));
            }),
          );
        } else {
          // Fallback se non c'è contenuto HTML nella configurazione
          window.open(DEFAULT_PRIVACY_POLICY_URL, '_blank');
          return from(Promise.resolve(null));
        }
      }),
    );
  }

  /**
   * Show privacy agree alert and handle user response
   * @param isLoggedIn Whether the user is currently logged in
   * @param confPrivacy$ Observable for privacy configuration
   * @returns Observable that emits when the alert is dismissed
   */
  public showPrivacyAgreeAlert(
    isLoggedIn: boolean,
    confPrivacy$: Observable<IPROJECT>,
  ): Observable<any> {
    return new Observable(observer => {
      // Use translations
      const title = this._langSvc.instant('privacy.agree.title');
      const message = this._langSvc.instant('privacy.agree.message');
      const readPrivacy = this._langSvc.instant('privacy.agree.read_privacy');
      const accept = this._langSvc.instant('privacy.agree.accept');
      const reject = this._langSvc.instant('privacy.agree.reject');

      this._alertCtrl
        .create({
          header: title,
          message: message,
          buttons: [
            {
              text: readPrivacy,
              handler: () => {
                this.openPrivacyPolicy().subscribe({
                  next: () => {},
                  error: error => {},
                });
                return false;
              },
            },
            {
              text: accept,
              handler: () => {
                // Close the main alert first, then show confirmation
                this._alertCtrl.dismiss().then(() => {
                  this._showConfirmationAlert(true, isLoggedIn, observer);
                });
                return true; // Close the alert
              },
            },
            {
              text: reject,
              role: 'cancel',
              handler: () => {
                // Close the main alert first, then show confirmation
                this._alertCtrl.dismiss().then(() => {
                  this._showConfirmationAlert(false, isLoggedIn, observer);
                });
                return true; // Close the alert
              },
            },
          ],
        })
        .then(alert => {
          alert.present();
        });
    });
  }

  /**
   * Update privacy agree status
   */
  public updatePrivacyAgreeStatus(): void {
    this.privacyAgreeSubject.next(this._hasPrivacyAgreeInLocalStorage());
  }

  /**
   * Check privacy agree after a small delay for non-logged users
   */
  private _checkPrivacyAgreeAfterDelay(): void {
    setTimeout(() => {
      this._checkPrivacyAgreeStatus();
    }, 100);
  }

  /**
   * Check if privacy agree is needed and show alert if necessary
   */
  private _checkPrivacyAgreeStatus(): void {
    // Don't show automatic alert if manual alert is already open
    if (this.isManualAlertOpen) {
      return;
    }

    this.needsPrivacyAgree$.pipe(take(1)).subscribe(needsPrivacyAgree => {
      if (needsPrivacyAgree) {
        this.isLogged$.pipe(take(1)).subscribe(isLogged => {
          this.showPrivacyAgreeAlert(isLogged, this._store.select(confPRIVACY)).subscribe();
        });
      }
    });
  }

  /**
   * Check if user has privacy agree in localStorage
   */
  private _hasPrivacyAgreeInLocalStorage(): boolean {
    return localStorage.getItem('privacy_agree') === 'true';
  }

  /**
   * Save privacy agree to both localStorage and backend
   * @param privacyAgree Whether user accepted privacy agree
   * @param isLoggedIn Whether the user is currently logged in
   * @param isSignup Whether this is during signup (no confirmation needed)
   */
  private _savePrivacyAgree(
    privacyAgree: boolean,
    isLoggedIn: boolean,
    isSignup: boolean = false,
  ): void {
    // Save to localStorage
    if (privacyAgree) {
      localStorage.setItem('privacy_agree', 'true');
      localStorage.setItem('privacy_agree_date', new Date().toISOString());
    } else {
      localStorage.removeItem('privacy_agree');
      localStorage.removeItem('privacy_agree_date');
    }

    // Update local state
    this.updatePrivacyAgreeStatus();

    // Save to backend if user is logged in
    if (isLoggedIn) {
      this.confAPP$.pipe(take(1)).subscribe(confApp => {
        const appId = confApp.id ?? confApp.geohubId;
        if (appId) {
          this._authSvc.updatePrivacyAgree(privacyAgree, Number(appId)).subscribe({
            next: response => {
              // Dispatch updated user to store (response is now the user directly with fresh data from me() subscribe in backend)
              this._store.dispatch(loadAuthsSuccess({user: response}));

              // Emit event when privacy agree is accepted to trigger UGC sync
              if (privacyAgree) {
                this.privacyAgreeAcceptedSubject.next();
              }
            },
            error: error => {
              // Error updating privacy agree in backend
            },
          });
        }
      });
    } else {
      // If user is not logged in but accepted privacy agree, still emit the event
      if (privacyAgree) {
        this.privacyAgreeAcceptedSubject.next();
      }
    }
  }

  /**
   * Sync privacy agree response to localStorage
   */
  private _syncPrivacyAgreeToLocalStorage(user: IUser): void {
    // Handle new API response format with properties.privacy
    const privacyArray = user.properties?.privacy;
    if (!privacyArray || privacyArray.length === 0) {
      // Remove any existing privacy agree data to force user to make a choice
      localStorage.removeItem('privacy_agree');
      localStorage.removeItem('privacy_agree_date');
      return;
    }

    // Get the latest privacy entry (assuming they are sorted by date)
    const latestPrivacy = privacyArray.reduce((latest, current) => {
      return new Date(current.date) > new Date(latest.date) ? current : latest;
    });

    if (latestPrivacy.agree) {
      localStorage.setItem('privacy_agree', 'true');
      localStorage.setItem('privacy_agree_date', latestPrivacy.date);
    } else {
      localStorage.removeItem('privacy_agree');
      localStorage.removeItem('privacy_agree_date');
    }
  }

  /**
   * Sync privacy agree from backend (without waiting)
   */
  private _syncPrivacyAgreeFromBackend(): void {
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      if (isLogged) {
        this.confAPP$.pipe(take(1)).subscribe(confApp => {
          const appId = confApp.id ?? confApp.geohubId;
          if (appId) {
            this._authSvc.me().subscribe({
              next: (user: IUser) => {
                // Always dispatch updated user to store
                this._store.dispatch(loadAuthsSuccess({user: user}));

                // Always update privacy agree status, even if no privacy data exists
                this._syncPrivacyAgreeToLocalStorage(user);
                this.updatePrivacyAgreeStatus();
                this._checkPrivacyAgreeStatus();
              },
              error: error => {
                // Using localStorage data due to backend error
              },
            });
          }
        });
      }
    });
  }

  /**
   * Sync privacy agree from backend and wait for completion
   */
  private _syncPrivacyAgreeFromBackendAndWait(): void {
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      if (isLogged) {
        this.confAPP$.pipe(take(1)).subscribe(confApp => {
          const appId = confApp.id ?? confApp.geohubId;
          if (appId) {
            this._authSvc.me().subscribe({
              next: (user: IUser) => {
                // Always dispatch updated user to store
                this._store.dispatch(loadAuthsSuccess({user: user}));

                // Always update privacy agree status, even if no privacy data exists
                this._syncPrivacyAgreeToLocalStorage(user);
                this.updatePrivacyAgreeStatus();
                this._checkPrivacyAgreeStatus();
              },
              error: error => {
                // Using localStorage data due to backend error
              },
            });
          }
        });
      }
    });
  }

  /**
   * Show confirmation alert for privacy agree changes
   * @param accepted Whether user accepted or rejected
   * @param isLoggedIn Whether user is logged in
   * @param observer Original alert observer
   */
  private _showConfirmationAlert(accepted: boolean, isLoggedIn: boolean, observer: any): void {
    const confirmTitle = this._langSvc.instant('privacy.agree.confirm.title');
    const confirmMessage = accepted
      ? this._langSvc.instant('privacy.agree.confirm.accept_message')
      : this._langSvc.instant('privacy.agree.confirm.reject_message');
    const confirmYes = this._langSvc.instant('privacy.agree.confirm.yes');
    const confirmNo = this._langSvc.instant('privacy.agree.confirm.no');

    this._alertCtrl
      .create({
        header: confirmTitle,
        message: confirmMessage,
        buttons: [
          {
            text: confirmNo,
            role: 'cancel',
            handler: () => {
              // Complete the observer without saving anything
              observer.next(null);
              observer.complete();
            },
          },
          {
            text: confirmYes,
            handler: () => {
              this._savePrivacyAgree(accepted, isLoggedIn, false);
              // Show final confirmation alert after saving
              this._showFinalConfirmationAlert(accepted, observer);
            },
          },
        ],
      })
      .then(alert => {
        alert.present();
      });
  }

  /**
   * Show final confirmation alert after privacy agree change is completed
   * @param accepted Whether user accepted or rejected
   * @param observer Original alert observer
   */
  private _showFinalConfirmationAlert(accepted: boolean, observer: any): void {
    const finalTitle = this._langSvc.instant('privacy.agree.final_confirm.title');
    const finalMessage = accepted
      ? this._langSvc.instant('privacy.agree.final_confirm.accept_message')
      : this._langSvc.instant('privacy.agree.final_confirm.reject_message');
    const okButton = this._langSvc.instant('privacy.agree.final_confirm.ok');

    this._alertCtrl
      .create({
        header: finalTitle,
        message: finalMessage,
        buttons: [
          {
            text: okButton,
            handler: () => {
              observer.next(accepted);
              observer.complete();
            },
          },
        ],
      })
      .then(alert => {
        alert.present();
      });
  }
}
