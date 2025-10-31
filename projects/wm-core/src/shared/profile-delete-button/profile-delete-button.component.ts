import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {from} from 'rxjs';
import {take} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {deleteUser} from '@wm-core/store/auth/auth.actions';

@Component({
  selector: 'wm-profile-delete-button',
  templateUrl: './profile-delete-button.component.html',
  styleUrls: ['./profile-delete-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmProfileDeleteButtonComponent {
  constructor(
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
    private _store: Store,
  ) {}

  /**
   * Delete user profile
   */
  deleteUserAlert(): void {
    from(
      this._alertCtrl.create({
        header: this._langSvc.instant('Attenzione'),
        subHeader: this._langSvc.instant('Azione irreversibile'),
        message: this._langSvc.instant(
          'Vuoi veramente eliminare il tuo account? È obbligatorio scrivere "delete account" per procedere.',
        ),
        inputs: [
          {
            name: 'confirmationInput',
            type: 'text',
            placeholder: this._langSvc.instant('Digita "delete account"'),
          },
        ],
        buttons: [
          {
            text: this._langSvc.instant('Annulla'),
            role: 'cancel',
          },
          {
            text: this._langSvc.instant('Conferma'),
            role: 'confirm',
            handler: async alertData => {
              if (alertData.confirmationInput === 'delete account') {
                this._store.dispatch(deleteUser());
              } else {
                const errorAlert = await this._alertCtrl.create({
                  header: this._langSvc.instant('Attenzione'),
                  message: this._langSvc.instant(
                    'La conferma non corrisponde. Digita "delete account" per procedere.',
                  ),
                  buttons: [this._langSvc.instant('generic.ok')],
                });
                await errorAlert.present();
              }
            },
          },
        ],
      }),
    )
      .pipe(take(1))
      .subscribe(l => {
        l.present();
      });
  }
}
