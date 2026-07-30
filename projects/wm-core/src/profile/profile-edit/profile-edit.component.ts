import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {AlertController, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Actions, ofType} from '@ngrx/effects';
import {Photo} from '@capacitor/camera';
import {BehaviorSubject, from, Subject} from 'rxjs';
import {take, takeUntil} from 'rxjs/operators';
import {CameraService} from '@wm-core/services/camera.service';
import {LangService} from '@wm-core/localization/lang.service';
import * as AuthActions from '@wm-core/store/auth/auth.actions';

export enum EProfileEditState {
  IDLE = 'IDLE',
  UPLOADING_PHOTO = 'UPLOADING_PHOTO',
  SAVING = 'SAVING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Modale di modifica del profilo utente (nome, cognome, avatar). Apribile via
 * `ModalController` da `ProfileUserComponent` (Task 6). Osserva direttamente l'esito
 * dell'azione `updateUserProfile` filtrando lo stream `Actions` su `loadAuthsSuccess`/
 * `updateUserProfileFailure` (stesso pattern generico già usato da `updatePrivacyAgree$`
 * in `auth.effects.ts` — nessun ID di correlazione dedicato esiste per nessuno di questi
 * flussi): al successo chiude il modale, all'errore mostra un alert nativo.
 */
@Component({
  standalone: false,
  selector: 'wm-profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  @Input() currentName: string;
  @Input() currentSurname: string;
  @Input() currentAvatarUrl: string;

  profileForm: UntypedFormGroup;
  selectedPhoto: Photo | null = null;
  state$: BehaviorSubject<EProfileEditState> = new BehaviorSubject<EProfileEditState>(
    EProfileEditState.IDLE,
  );
  submitted$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  readonly EProfileEditState = EProfileEditState;

  private _destroy$ = new Subject<void>();

  constructor(
    private _formBuilder: UntypedFormBuilder,
    private _modalCtrl: ModalController,
    private _store: Store,
    private _cameraSvc: CameraService,
    private _actions$: Actions,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
  ) {
    this.profileForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      surname: ['', [Validators.maxLength(255)]],
    });
  }

  /**
   * Precompila il form con i valori correnti del profilo, passati dal chiamante via
   * `@Input`.
   */
  ngOnInit(): void {
    this.profileForm.patchValue({
      name: this.currentName ?? '',
      surname: this.currentSurname ?? '',
    });
  }

  /**
   * Chiude il modale senza salvare.
   */
  dismiss(): void {
    this._modalCtrl.dismiss();
  }

  /**
   * Chiude la subscription su `Actions` avviata in `save()` — stesso pattern
   * `takeUntil(this._destroy$)` già usato in `geobox-map.component.ts` per un
   * componente (non un effect) che inietta `Actions` direttamente. Senza questo, se il
   * modale viene chiuso prima che il salvataggio risolva, una `loadAuthsSuccess`/
   * `updateUserProfileFailure` successiva e non correlata chiamerebbe comunque
   * `this._modalCtrl.dismiss()`, potenzialmente chiudendo un modale diverso aperto nel
   * frattempo.
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Apre il picker foto (camera/galleria) e mantiene la foto selezionata in memoria,
   * pronta per essere inviata al salvataggio.
   */
  async pickPhoto(): Promise<void> {
    this.state$.next(EProfileEditState.UPLOADING_PHOTO);
    try {
      this.selectedPhoto = await this._cameraSvc.addProfilePhoto();
      this.state$.next(EProfileEditState.IDLE);
    } catch (e) {
      // Annullamento esplicito dell'utente o permesso negato: torna a IDLE senza
      // mostrare un errore (non è un fallimento, è una scelta dell'utente).
      this.state$.next(EProfileEditState.IDLE);
    }
  }

  /**
   * Valida il form e, se valido, dispatcha `updateUserProfile` con i nuovi valori
   * (nome sempre presente, cognome/foto opzionali) e osserva l'esito dell'azione per
   * transizionare a `SUCCESS`/`ERROR` e chiudere il modale o mostrare un alert.
   */
  save(): void {
    this.submitted$.next(true);
    if (this.profileForm.invalid) {
      return;
    }

    this.state$.next(EProfileEditState.SAVING);
    this._store.dispatch(
      AuthActions.updateUserProfile({
        name: this.profileForm.value.name,
        surname: this.profileForm.value.surname,
        avatarPhoto: this.selectedPhoto ?? undefined,
      }),
    );

    this._actions$
      .pipe(
        ofType(AuthActions.loadAuthsSuccess, AuthActions.updateUserProfileFailure),
        take(1),
        takeUntil(this._destroy$),
      )
      .subscribe(action => {
        if (action.type === AuthActions.loadAuthsSuccess.type) {
          this.state$.next(EProfileEditState.SUCCESS);
          this._modalCtrl.dismiss();
        } else {
          this.state$.next(EProfileEditState.ERROR);
          this._showSaveErrorAlert();
        }
      });
  }

  /**
   * Alert nativo mostrato quando `updateUserProfile` fallisce lato backend — stesso
   * pattern (message via `LangService.instant`) già usato da `deleteTrack()` in
   * `ugc-track-properties.component.ts`.
   */
  private _showSaveErrorAlert(): void {
    from(
      this._alertCtrl.create({
        message: this._langSvc.instant(
          'Non è stato possibile salvare le modifiche al profilo. Riprova.',
        ),
        buttons: [this._langSvc.instant('OK')],
      }),
    ).subscribe(alert => alert.present());
  }
}
