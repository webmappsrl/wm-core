import {Injectable} from '@angular/core';
import {AlertController, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {DEFAULT_PRIVACY_POLICY_URL} from '@wm-core/constants/links';
import {WmInnerHtmlComponent} from '@wm-core/inner-html/inner-html.component';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged, needsDataConsent} from '@wm-core/store/auth/auth.selectors';
import {AuthService} from '@wm-core/store/auth/auth.service';
import {confAPP, confPRIVACY} from '@wm-core/store/conf/conf.selector';
import {IAPP} from '@wm-core/types/config';

import {BehaviorSubject, Observable, from} from 'rxjs';

import {filter, switchMap, take} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataConsentService {
  private dataConsentSubject = new BehaviorSubject<boolean>(this._hasDataConsentInLocalStorage());
  private isConsentSyncComplete = false;

  public confAPP$: Observable<IAPP> = this._store.select(confAPP);
  public dataConsent$ = this.dataConsentSubject.asObservable();
  public isLogged$: Observable<boolean> = this._store.select(isLogged);
  public needsDataConsent$: Observable<boolean> = this._store.select(needsDataConsent);

  constructor(
    private _alertCtrl: AlertController,
    private _modalCtrl: ModalController,
    private _store: Store,
    private _authSvc: AuthService,
    private _langSvc: LangService,
  ) {}

  /**
   * Get current consent status
   */
  public getCurrentConsentStatus(): boolean {
    return this._hasDataConsentInLocalStorage();
  }

  /**
   * Initialize consent management - call this from app component
   */
  public initializeConsentManagement(): void {
    // Force sync consent from backend on app startup if user is already logged in
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      if (isLogged) {
        this._syncDataConsentFromBackendAndWait();
      } else {
        // If user is not logged in, check consent normally
        this._checkConsentAfterDelay();
      }
    });

    // Update data consent status when user logs in
    this.isLogged$.pipe(filter(isLogged => isLogged)).subscribe(() => {
      // Sync consent from backend and update status after a small delay to ensure user is fully logged in
      setTimeout(() => {
        this._syncDataConsentFromBackend();
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
   * Show data consent alert and handle user response
   * @param isLoggedIn Whether the user is currently logged in
   * @param confApp$ Observable for app configuration
   * @returns Observable that emits when the alert is dismissed
   */
  public showDataConsentAlert(isLoggedIn: boolean, confApp$: Observable<IAPP>): Observable<any> {
    return new Observable(observer => {
      // Use translations
      const title = this._langSvc.instant('data.consent.title');
      const message = this._langSvc.instant('data.consent.message');
      const readPrivacy = this._langSvc.instant('data.consent.read_privacy');
      const accept = this._langSvc.instant('data.consent.accept');
      const reject = this._langSvc.instant('data.consent.reject');

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
                console.log('User accepted data consent');
                this._saveDataConsent(true, isLoggedIn, confApp$);
                observer.next(true);
                observer.complete();
                return true;
              },
            },
            {
              text: reject,
              role: 'cancel',
              handler: async () => {
                console.log('User rejected data consent');

                // Save rejection to both localStorage and backend
                this._saveDataConsent(false, isLoggedIn, confApp$);

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
   * Update data consent status
   */
  public updateDataConsentStatus(): void {
    this.dataConsentSubject.next(this._hasDataConsentInLocalStorage());
  }

  /**
   * Check consent after a small delay for non-logged users
   */
  private _checkConsentAfterDelay(): void {
    setTimeout(() => {
      this._checkConsentStatus();
    }, 100);
  }

  /**
   * Check if consent is needed and show alert if necessary
   */
  private _checkConsentStatus(): void {
    this.needsDataConsent$.pipe(take(1)).subscribe(needsConsent => {
      console.log('🔍 Needs consent:', needsConsent);
      if (needsConsent) {
        console.log('⚠️ Needs consent, showing alert...');
        this.isLogged$.pipe(take(1)).subscribe(isLogged => {
          this.showDataConsentAlert(isLogged, this.confAPP$).subscribe();
        });
      } else {
        console.log('✅ No consent needed, alert not shown');
      }
    });
  }

  /**
   * Check if user has data consent in localStorage
   */
  private _hasDataConsentInLocalStorage(): boolean {
    return localStorage.getItem('privacy_consent') === 'true';
  }

  /**
   * Save data consent to both localStorage and backend
   * @param consent Whether user accepted consent
   * @param isLoggedIn Whether the user is currently logged in
   * @param confApp$ Observable for app configuration
   */
  private _saveDataConsent(
    consent: boolean,
    isLoggedIn: boolean,
    confApp$: Observable<IAPP>,
  ): void {
    // Save to localStorage
    if (consent) {
      localStorage.setItem('privacy_consent', 'true');
      localStorage.setItem('privacy_consent_date', new Date().toISOString());
    } else {
      localStorage.removeItem('privacy_consent');
      localStorage.removeItem('privacy_consent_date');
    }

    // Update local state
    this.updateDataConsentStatus();

    // Save to backend if user is logged in
    if (isLoggedIn) {
      confApp$.pipe(take(1)).subscribe(confApp => {
        const appId = confApp.id ?? confApp.geohubId;
        if (appId) {
          this._authSvc.updateDataConsent(consent, appId.toString()).subscribe({
            next: response => {
              console.log('Data consent updated in backend:', response);
            },
            error: error => {
              console.error('Error updating data consent in backend:', error);
            },
          });
        }
      });
    }
  }

  /**
   * Sync consent response to localStorage
   */
  private _syncConsentToLocalStorage(response: any): void {
    if (response.has_consent) {
      localStorage.setItem('privacy_consent', 'true');
      if (response.latest_consent?.consent_date) {
        localStorage.setItem('privacy_consent_date', response.latest_consent.consent_date);
      } else {
        localStorage.setItem('privacy_consent_date', new Date().toISOString());
      }
      console.log('✅ Synced consent: true to localStorage');
    } else {
      localStorage.removeItem('privacy_consent');
      localStorage.removeItem('privacy_consent_date');
      console.log('❌ Synced consent: false to localStorage');
    }
  }

  /**
   * Sync consent from backend (without waiting)
   */
  private _syncDataConsentFromBackend(): void {
    console.log('🔄 Starting consent sync from backend...');
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      console.log('🔍 User logged in:', isLogged);
      if (isLogged) {
        this.confAPP$.pipe(take(1)).subscribe(confApp => {
          const appId = confApp.id ?? confApp.geohubId;
          console.log('🔍 App ID for sync:', appId);
          if (appId) {
            this._authSvc.getDataConsent(appId.toString()).subscribe({
              next: response => {
                console.log('🔍 Backend consent response:', response);
                if (response.has_consent !== undefined) {
                  this._syncConsentToLocalStorage(response);
                  this.updateDataConsentStatus();
                  console.log('🔄 Re-checking consent status after sync...');
                  this._checkConsentStatus();
                }
              },
              error: error => {
                console.error('Error syncing data consent from backend:', error);
                console.log('Using localStorage data due to backend error');
              },
            });
          }
        });
      }
    });
  }

  /**
   * Sync consent from backend and wait for completion
   */
  private _syncDataConsentFromBackendAndWait(): void {
    console.log('🔄 Starting consent sync from backend and waiting...');
    this.isLogged$.pipe(take(1)).subscribe(isLogged => {
      console.log('🔍 User logged in:', isLogged);
      if (isLogged) {
        this.confAPP$.pipe(take(1)).subscribe(confApp => {
          const appId = confApp.id ?? confApp.geohubId;
          console.log('🔍 App ID for sync:', appId);
          if (appId) {
            this._authSvc.getDataConsent(appId.toString()).subscribe({
              next: response => {
                console.log('🔍 Backend consent response:', response);
                if (response.has_consent !== undefined) {
                  this._syncConsentToLocalStorage(response);
                  this.updateDataConsentStatus();
                  this.isConsentSyncComplete = true;
                  console.log('✅ Consent sync completed, allowing consent checks');
                  console.log('🔄 Checking consent status after sync...');
                  this._checkConsentStatus();
                }
              },
              error: error => {
                console.error('Error syncing data consent from backend:', error);
                console.log('Using localStorage data due to backend error');
                this.isConsentSyncComplete = true;
                console.log('✅ Consent sync completed (with error), allowing consent checks');
              },
            });
          }
        });
      }
    });
  }
}
