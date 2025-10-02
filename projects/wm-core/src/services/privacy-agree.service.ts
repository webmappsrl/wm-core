import {Injectable} from '@angular/core';
import {AlertController, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {DEFAULT_PRIVACY_POLICY_URL} from '@wm-core/constants/links';
import {WmInnerHtmlComponent} from '@wm-core/inner-html/inner-html.component';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {AuthService} from '@wm-core/store/auth/auth.service';
import {confAPP, confPRIVACY} from '@wm-core/store/conf/conf.selector';
import {IAPP} from '@wm-core/types/config';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {PrivacyAgreeHistory, PrivacyAgreeInfo} from '@wm-types/privacy-agree';

import {BehaviorSubject, Observable, from, of, Subject} from 'rxjs';

import {filter, switchMap, take, map, catchError} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PrivacyAgreeService {
  private privacyAgreeSubject = new BehaviorSubject<boolean>(this._hasPrivacyAgreeInLocalStorage());
  private isPrivacyAgreeSyncComplete = false;

  // Subject per comunicare l'accettazione del consenso senza dipendenze circolari
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
    private _environmentSvc: EnvironmentService,
  ) {}

  /**
   * Get current privacy agree status
   */
  public getCurrentPrivacyAgreeStatus(): boolean {
    return this._hasPrivacyAgreeInLocalStorage();
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
   * @param confApp$ Observable for app configuration
   * @returns Observable that emits when the alert is dismissed
   */
  public showPrivacyAgreeAlert(isLoggedIn: boolean, confApp$: Observable<IAPP>): Observable<any> {
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
                console.log('Opening privacy policy...');
                this.openPrivacyPolicy().subscribe({
                  next: () => console.log('Privacy policy opened successfully'),
                  error: error => console.error('Error opening privacy policy:', error),
                });
                return false;
              },
            },
            {
              text: accept,
              handler: () => {
                console.log('User accepted privacy agree');
                this._savePrivacyAgree(true, isLoggedIn, confApp$);
                observer.next(true);
                observer.complete();
                return true;
              },
            },
            {
              text: reject,
              role: 'cancel',
              handler: async () => {
                console.log('User rejected privacy agree');

                // Save rejection to both localStorage and backend
                this._savePrivacyAgree(false, isLoggedIn, confApp$);

                observer.next(false);
                observer.complete();
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
    this.needsPrivacyAgree$.pipe(take(1)).subscribe(needsPrivacyAgree => {
      console.log('🔍 Needs privacy agree:', needsPrivacyAgree);
      if (needsPrivacyAgree) {
        console.log('⚠️ Needs privacy agree, showing alert...');
        this.isLogged$.pipe(take(1)).subscribe(isLogged => {
          this.showPrivacyAgreeAlert(isLogged, this.confAPP$).subscribe();
        });
      } else {
        console.log('✅ No privacy agree needed, alert not shown');
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
   * @param confApp$ Observable for app configuration
   */
  private _savePrivacyAgree(
    privacyAgree: boolean,
    isLoggedIn: boolean,
    confApp$: Observable<IAPP>,
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
      confApp$.pipe(take(1)).subscribe(confApp => {
        const appId = confApp.id ?? confApp.geohubId;
        if (appId) {
          this._authSvc.updatePrivacyAgree(privacyAgree, Number(appId)).subscribe({
            next: response => {
              console.log('Privacy agree updated in backend:', response);

              // Emit event when privacy agree is accepted to trigger UGC sync
              if (privacyAgree) {
                console.log('🔄 User accepted privacy agree, emitting sync trigger event...');
                this.privacyAgreeAcceptedSubject.next();
              }
            },
            error: error => {
              console.error('Error updating privacy agree in backend:', error);
            },
          });
        }
      });
    } else {
      // If user is not logged in but accepted privacy agree, still emit the event
      if (privacyAgree) {
        console.log(
          '🔄 User accepted privacy agree (not logged in), emitting sync trigger event...',
        );
        this.privacyAgreeAcceptedSubject.next();
      }
    }
  }

  /**
   * Sync privacy agree response to localStorage
   */
  private _syncPrivacyAgreeToLocalStorage(response: any): void {
    // Handle new API response format with privacy_agree_info
    const privacyAgreeInfo: PrivacyAgreeInfo = response.privacy_agree_info || response;
    const hasPrivacyAgree = privacyAgreeInfo.has_agree;

    if (hasPrivacyAgree) {
      localStorage.setItem('privacy_agree', 'true');
      if (privacyAgreeInfo.latest_agree?.date) {
        localStorage.setItem('privacy_agree_date', privacyAgreeInfo.latest_agree.date);
      } else {
        localStorage.setItem('privacy_agree_date', new Date().toISOString());
      }
      console.log('✅ Synced privacy agree: true to localStorage');
    } else {
      localStorage.removeItem('privacy_agree');
      localStorage.removeItem('privacy_agree_date');
      console.log('❌ Synced privacy agree: false to localStorage');
    }
  }

  /**
   * Sync privacy agree from backend (without waiting)
   */
  private _syncPrivacyAgreeFromBackend(): void {
    console.log('🔄 Starting privacy agree sync from backend...');
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      console.log('🔍 User logged in:', isLogged);
      if (isLogged) {
        this.confAPP$.pipe(take(1)).subscribe(confApp => {
          const appId = confApp.id ?? confApp.geohubId;
          console.log('🔍 App ID for sync:', appId);
          if (appId) {
            this._authSvc.getPrivacyAgree(Number(appId)).subscribe({
              next: response => {
                console.log('🔍 Backend privacy agree response:', response);
                // Handle new API response format
                const privacyAgreeInfo: PrivacyAgreeInfo = response.privacy_agree_info || response;
                if (privacyAgreeInfo.has_agree !== undefined) {
                  this._syncPrivacyAgreeToLocalStorage(response);
                  this.updatePrivacyAgreeStatus();
                  console.log('🔄 Re-checking privacy agree status after sync...');
                  this._checkPrivacyAgreeStatus();
                }
              },
              error: error => {
                console.error('Error syncing privacy agree from backend:', error);
                console.log('Using localStorage data due to backend error');
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
    console.log('🔄 Starting privacy agree sync from backend and waiting...');
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      console.log('🔍 User logged in:', isLogged);
      if (isLogged) {
        this.confAPP$.pipe(take(1)).subscribe(confApp => {
          const appId = confApp.id ?? confApp.geohubId;
          console.log('🔍 App ID for sync:', appId);
          if (appId) {
            this._authSvc.getPrivacyAgree(Number(appId)).subscribe({
              next: response => {
                console.log('🔍 Backend privacy agree response:', response);
                // Handle new API response format
                const privacyAgreeInfo: PrivacyAgreeInfo = response.privacy_agree_info || response;
                if (privacyAgreeInfo.has_agree !== undefined) {
                  this._syncPrivacyAgreeToLocalStorage(response);
                  this.updatePrivacyAgreeStatus();
                  this.isPrivacyAgreeSyncComplete = true;
                  console.log('✅ Privacy agree sync completed, allowing privacy agree checks');
                  console.log('🔄 Checking privacy agree status after sync...');
                  this._checkPrivacyAgreeStatus();
                }
              },
              error: error => {
                console.error('Error syncing privacy agree from backend:', error);
                console.log('Using localStorage data due to backend error');
                this.isPrivacyAgreeSyncComplete = true;
                console.log(
                  '✅ Privacy agree sync completed (with error), allowing privacy agree checks',
                );
              },
            });
          }
        });
      }
    });
  }

  /**
   * Get privacy agree history from backend
   */
  public getPrivacyAgreeHistory(): Observable<PrivacyAgreeHistory | null> {
    const appId = this._environmentSvc.appId;
    if (!appId) {
      return of(null);
    }

    return this._authSvc.getPrivacyAgree(Number(appId)).pipe(
      map((response: any): PrivacyAgreeHistory | null => {
        // Handle new API response format with privacy_agree_info
        const privacyAgreeInfo: PrivacyAgreeInfo = response.privacy_agree_info || response;
        if (privacyAgreeInfo && (privacyAgreeInfo.latest_agree || privacyAgreeInfo.agree_history)) {
          return {
            latest_agree: privacyAgreeInfo.latest_agree,
            agree_history: privacyAgreeInfo.agree_history || [],
          };
        }
        return null;
      }),
      catchError(error => {
        console.error('Error fetching privacy agree history:', error);
        return of(null);
      }),
    );
  }

  /**
   * Get the most recent privacy agree date for logging purposes
   * @param privacyAgreeHistory Privacy agree history from backend
   * @returns Date of most recent privacy agree change, or null if no history
   */
  public getMostRecentPrivacyAgreeDate(
    privacyAgreeHistory: PrivacyAgreeHistory | null,
  ): Date | null {
    if (
      !privacyAgreeHistory ||
      !privacyAgreeHistory.agree_history ||
      privacyAgreeHistory.agree_history.length === 0
    ) {
      return null;
    }

    const sortedHistory = [...privacyAgreeHistory.agree_history].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return new Date(sortedHistory[0].date);
  }
}
