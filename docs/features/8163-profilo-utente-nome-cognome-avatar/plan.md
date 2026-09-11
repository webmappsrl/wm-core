> Ticket: oc:8163

# Profilo utente: nome, cognome e avatar (wm-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estendere `IUser` con `surname`/`avatar_url`, aggiungere un nuovo modale `ProfileEditComponent` per modificare nome, cognome e foto profilo, e mostrare l'avatar reale o un fallback a iniziali in `profile-user.component`.

**Architecture:** Nuova action/effect NgRx (`updateUserProfile`) che invia `FormData`/multipart a `POST /api/auth/user` (endpoint già esistente, verificato in `wm-package/routes/api.php:31`), riusando `loadAuthsSuccess` come azione di successo (stesso pattern di `updatePrivacyAgree$`). Nuovo metodo `CameraService.addProfilePhoto()` che riusa l'action sheet di `addPhotos()` senza modificarlo. Nuova pipe pura `WmUserInitialsPipe` per il fallback iniziali.

**Tech Stack:** Angular 20 (NgModule, non standalone), Ionic 8, NgRx 20, `@capacitor/camera`, Karma/Jasmine.

## Global Constraints

- Nessun commit/branch automatico: i comandi `git commit` nei task sono istruzioni testuali per lo sviluppatore.
- Commit convention: `feat(oc:8163): ...` / `fix(oc:8163): ...`.
- Questo piano dipende dal contratto API già collaudato in wm-package (piano `wm-package`, Task 3/4) — ma il fallback a iniziali permette di sviluppare e testare la UI anche prima che il backend sia disponibile su uno shard specifico.
- Mai concatenare `user.name` e `user.surname` in un'unica stringa visualizzata (rischio duplicazione per utenti esistenti con `name` già completo, es. "Gianlorenzo Spaggiari" → confermato su DB produzione camminiditalia).
- Traduzioni: testo base in italiano, chiavi aggiunte in tutti e 7 i file (`it, en, de, es, fr, pr, sq`).
- `addPhotos()` esistente in `CameraService` (usato dai flussi UGC, firma `Promise<Photo[]>`) non va modificato — nuovo metodo dedicato `addProfilePhoto()`.
- JSDoc richiesto su funzioni/metodi pubblici (enforced da ESLint sul repo principale).

---

### Task 1: `IUser` — aggiungi `surname` e `avatar_url`

**Files:**
- Modify: `projects/wm-core/src/store/auth/auth.model.ts`

**Interfaces:**
- Produces: `IUser.surname?: string`, `IUser.avatar_url?: string` — consumati da Task 2 (pipe iniziali), Task 5 (form edit), Task 6 (`profile-user.component`).

- [ ] **Step 1: Modifica l'interfaccia**

In `auth.model.ts`:

```typescript
export interface IUser {
  id: number;
  email?: string;
  name?: string;
  surname?: string;
  avatar_url?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  access_token: string;
  properties?: {
    privacy?: Privacy[];
  };
}
```

- [ ] **Step 2: Verifica la compilazione TypeScript**

Run: `cd core && npx tsc --noEmit -p src/app/shared/wm-core/projects/wm-core/tsconfig.lib.json`
Expected: nessun nuovo errore (i due campi sono opzionali, nessun consumer esistente si rompe).

- [ ] **Step 3: Commit**

```bash
git add projects/wm-core/src/store/auth/auth.model.ts
git commit -m "feat(oc:8163): add surname and avatar_url to IUser"
```

---

### Task 2: Pipe pura `WmUserInitialsPipe` — fallback iniziali

**Files:**
- Create: `projects/wm-core/src/pipes/wm-user-initials.pipe.ts`
- Test: `projects/wm-core/src/pipes/wm-user-initials.pipe.spec.ts`
- Modify: `projects/wm-core/src/pipes/pipe.module.ts`

**Interfaces:**
- Produces: pipe `userInitials` — `transform(name: string | null | undefined): string`. Consumata da Task 6 (`profile-user.component.html`).

- [ ] **Step 1: Scrivi il test fallente**

```typescript
import {WmUserInitialsPipe} from './wm-user-initials.pipe';

describe('WmUserInitialsPipe', () => {
  let pipe: WmUserInitialsPipe;

  beforeEach(() => {
    pipe = new WmUserInitialsPipe();
  });

  it('returns the uppercase first letter of the name', () => {
    expect(pipe.transform('mario')).toBe('M');
  });

  it('returns only the first letter even if the name contains a space (full name in a single field)', () => {
    expect(pipe.transform('Gianlorenzo Spaggiari')).toBe('G');
  });

  it('trims leading whitespace before taking the first letter', () => {
    expect(pipe.transform('  Paolo')).toBe('P');
  });

  it('returns an empty string for null, undefined or empty name', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('   ')).toBe('');
  });
});
```

- [ ] **Step 2: Esegui il test per verificare che fallisca**

Run: `cd core && npx ng test wm-core --include='**/wm-user-initials.pipe.spec.ts' --watch=false`
Expected: FAIL — `WmUserInitialsPipe` non esiste.

- [ ] **Step 3: Scrivi la pipe**

```typescript
import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'userInitials',
  pure: true,
})
export class WmUserInitialsPipe implements PipeTransform {
  /**
   * Restituisce la sola iniziale (maiuscola) del nome fornito, o stringa vuota
   * se il nome è assente/vuoto — mai un placeholder generico (es. "?").
   */
  transform(name: string | null | undefined): string {
    const trimmed = (name ?? '').trim();
    if (trimmed.length === 0) {
      return '';
    }
    return trimmed.charAt(0).toUpperCase();
  }
}
```

- [ ] **Step 4: Registra la pipe in `pipe.module.ts`**

Aggiungi l'import e la voce nell'array `pipes`:

```typescript
import {WmUserInitialsPipe} from './wm-user-initials.pipe';
```

```typescript
const pipes = [
  // ...esistenti
  WmHasLogoPipe,
  WmUserInitialsPipe,
];
```

- [ ] **Step 5: Esegui il test per verificare che passi**

Run: `cd core && npx ng test wm-core --include='**/wm-user-initials.pipe.spec.ts' --watch=false`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add projects/wm-core/src/pipes/wm-user-initials.pipe.ts projects/wm-core/src/pipes/wm-user-initials.pipe.spec.ts projects/wm-core/src/pipes/pipe.module.ts
git commit -m "feat(oc:8163): add WmUserInitialsPipe for avatar fallback"
```

---

### Task 3: Store auth — action/effect `updateUserProfile`

**Files:**
- Modify: `projects/wm-core/src/store/auth/auth.actions.ts`
- Modify: `projects/wm-core/src/store/auth/auth.service.ts`
- Modify: `projects/wm-core/src/store/auth/auth.effects.ts`

**Interfaces:**
- Consumes: `IUser` (Task 1).
- Produces: `updateUserProfile({name?: string; surname?: string; avatarPhoto?: Photo})` action; `AuthService.updateProfile(data): Observable<IUser>`. Consumato da Task 5 (`ProfileEditComponent`).

- [ ] **Step 1: Aggiungi le nuove action in `auth.actions.ts`**

```typescript
import {Photo} from '@capacitor/camera';
```

```typescript
export const updateUserProfile = createAction(
  '[Auth] update user profile',
  props<{name?: string; surname?: string; avatarPhoto?: Photo}>(),
);
export const updateUserProfileFailure = createAction(
  '[Auth] update user profile failure',
  props<{error: HttpErrorResponse}>(),
);
```

- [ ] **Step 2: Aggiungi `AuthService.updateProfile()` in `auth.service.ts`**

Aggiungi l'import in testa al file:

```typescript
import {Photo} from '@capacitor/camera';
import {CameraService} from '@wm-core/services/camera.service';
```

Aggiungi `CameraService` al costruttore:

```typescript
constructor(
  private _http: HttpClient,
  private _environmentSvc: EnvironmentService,
  private _store: Store,
  private _langSvc: LangService,
  private _alertCtrl: AlertController,
  private _modalCtrl: ModalController,
  private _cameraSvc: CameraService,
) {}
```

Aggiungi il metodo (dopo `updatePrivacyAgree`):

```typescript
/**
 * Update name, surname and/or avatar photo. Builds multipart FormData only
 * when an avatarPhoto is provided; otherwise sends plain JSON (same endpoint
 * already used by updatePrivacyAgree, POST /api/auth/user).
 */
updateProfile(data: {name?: string; surname?: string; avatarPhoto?: Photo}): Observable<IUser> {
  if (!data.avatarPhoto) {
    const body: {name?: string; surname?: string} = {};
    if (data.name != null) body.name = data.name;
    if (data.surname != null) body.surname = data.surname;
    return this._http.post(`${this._environmentSvc.origin}/api/auth/user`, body) as Observable<IUser>;
  }

  return from(this._cameraSvc.getPhotoFile({
    id: data.avatarPhoto.path ?? data.avatarPhoto.webPath,
    photoURL: data.avatarPhoto.webPath,
    datasrc: data.avatarPhoto.webPath,
    position: null,
  } as any)).pipe(
    switchMap(blob => {
      const formData = new FormData();
      if (data.name != null) formData.append('name', data.name);
      if (data.surname != null) formData.append('surname', data.surname);
      formData.append('avatar', blob, 'avatar.jpg');
      return this._http.post(`${this._environmentSvc.origin}/api/auth/user`, formData) as Observable<IUser>;
    }),
  );
}
```

Nota: `CameraService.getPhotoFile()` esiste già (usato dai flussi UGC) e sa già estrarre un `Blob` da un `Photo`/`IPhotoItem` — qui lo riusiamo passandogli solo i campi che effettivamente legge (`photoURL`), senza duplicare la logica di conversione file→blob.

- [ ] **Step 3: Aggiungi l'effect in `auth.effects.ts`**

```typescript
updateUserProfile$ = createEffect(() => {
  return this._actions$.pipe(
    ofType(AuthActions.updateUserProfile),
    switchMap(action =>
      this._authSvc.updateProfile(action).pipe(
        map(user => {
          saveAuth(user);
          return AuthActions.loadAuthsSuccess({user});
        }),
        catchError(error => {
          return of(AuthActions.updateUserProfileFailure({error}));
        }),
      ),
    ),
  );
});
```

Nota (da documentare in `notes.md`): questo effect riusa `loadAuthsSuccess` come azione di successo, stesso pattern di `updatePrivacyAgree$` — questo fa scattare anche `syncUgcAfterAuthSuccess$` (dispatcha `syncUgc()` se l'utente ha già accettato la privacy). È un effetto collaterale accettato, non un bug: `updatePrivacyAgree$` esistente ha già lo stesso comportamento, quindi non introduce un pattern nuovo, solo un `syncUgc()` ridondante ad ogni modifica profilo per utenti già loggati con privacy accettata.

- [ ] **Step 4: Verifica la compilazione**

Run: `cd core && npx tsc --noEmit -p src/app/shared/wm-core/projects/wm-core/tsconfig.lib.json`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add projects/wm-core/src/store/auth/auth.actions.ts projects/wm-core/src/store/auth/auth.service.ts projects/wm-core/src/store/auth/auth.effects.ts
git commit -m "feat(oc:8163): add updateUserProfile action/effect with multipart avatar upload"
```

---

### Task 4: `CameraService.addProfilePhoto()` — nuovo metodo dedicato

**Files:**
- Modify: `projects/wm-core/src/services/camera.service.ts`

**Interfaces:**
- Produces: `CameraService.addProfilePhoto(): Promise<Photo>` — consumato da Task 5 (`ProfileEditComponent`). `addPhotos()` esistente resta invariato (firma `Promise<Photo[]>`, usato dai flussi UGC).

- [ ] **Step 1: Aggiungi il metodo**

In `camera.service.ts`, dopo `addPhotos()`:

```typescript
/**
 * Same action sheet as addPhotos() (Scatta una foto / Dalla libreria / Annulla)
 * but returns a single Photo — used for profile avatar upload. Does not touch
 * addPhotos(), which is shared by the UGC flows and returns Photo[].
 */
async addProfilePhoto(): Promise<Photo> {
  return new Promise<Photo>((resolve, reject) => {
    this._actionSheetCtrl
      .create({
        header: this._lanSvc.instant("Origine dell'immagine"),
        buttons: [
          {
            text: this._lanSvc.instant('Scatta una foto'),
            handler: () => {
              this.shotPhoto().then(photo => resolve(photo));
            },
          },
          {
            text: this._lanSvc.instant('Dalla libreria'),
            handler: () => {
              this.getPhotos(null).then(photos => {
                if (photos.length === 0) {
                  reject();
                  return;
                }
                resolve(photos[0]);
              });
            },
          },
          {
            text: this._lanSvc.instant('Annulla'),
            role: 'cancel',
            handler: () => {
              reject();
            },
          },
        ],
      })
      .then(actionSheet => {
        actionSheet.present();
      });
  });
}
```

- [ ] **Step 2: Aggiungi il limite dimensione lato client**

Nel metodo `getPhotos()` esistente (già usato sia da `addPhotos()` che dal nuovo `addProfilePhoto()`), imposta esplicitamente `width`/`quality` nell'oggetto `GalleryImageOptions` per contenere la dimensione delle foto selezionate dalla libreria:

```typescript
const options: GalleryImageOptions = {
  quality: 80,
  width: 1600,
};
```

Nota: questo abbassa leggermente la qualità/dimensione anche per il flusso UGC esistente (che condivide `getPhotos()`) — verificato in Fase: challenge come rischio noto ("nessun limite dimensione oggi"); 1600px/qualità 80 è già ampiamente sufficiente per un avatar e non degrada visibilmente le foto UGC (usate in gallerie a schermo intero, non stampe). Se in code review si preferisce isolare questo limite al solo avatar, estrarre un `getPhotos(options?: Partial<GalleryImageOptions>)` parametrizzato invece di modificare il default condiviso.

- [ ] **Step 3: Verifica la compilazione**

Run: `cd core && npx tsc --noEmit -p src/app/shared/wm-core/projects/wm-core/tsconfig.lib.json`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add projects/wm-core/src/services/camera.service.ts
git commit -m "feat(oc:8163): add addProfilePhoto() and client-side size limit to CameraService"
```

---

### Task 5: `ProfileEditComponent` — nuovo modale

**Files:**
- Create: `projects/wm-core/src/profile/profile-edit/profile-edit.component.ts`
- Create: `projects/wm-core/src/profile/profile-edit/profile-edit.component.html`
- Create: `projects/wm-core/src/profile/profile-edit/profile-edit.component.scss`
- Test: `projects/wm-core/src/profile/profile-edit/profile-edit.component.spec.ts`
- Modify: `projects/wm-core/src/profile/profile.module.ts`

**Interfaces:**
- Consumes: `IUser` (Task 1), `updateUserProfile` action (Task 3), `CameraService.addProfilePhoto()` (Task 4), `WmUserInitialsPipe` (Task 2).
- Produces: componente `ProfileEditComponent` (`wm-profile-edit`), apribile via `ModalController` — consumato da Task 6 (`profile-user.component`).

- [ ] **Step 1: Scrivi lo spec (istanza TS pura, senza `TestBed`)**

Pattern già in uso nel repo per evitare il crash `NG0201` su `APP_TRANSLATION` mancante in DI (vedi `ugc-track-properties.component.spec.ts`, oc:8183):

```typescript
import {ProfileEditComponent} from './profile-edit.component';

describe('ProfileEditComponent', () => {
  let component: ProfileEditComponent;
  let modalCtrlSpy: any;
  let storeSpy: any;
  let cameraSvcSpy: any;
  let formBuilder: any;

  beforeEach(() => {
    modalCtrlSpy = {dismiss: jasmine.createSpy('dismiss')};
    storeSpy = {
      dispatch: jasmine.createSpy('dispatch'),
      pipe: () => ({subscribe: () => {}}),
      select: () => ({pipe: () => ({subscribe: () => {}})}),
    };
    cameraSvcSpy = {addProfilePhoto: jasmine.createSpy('addProfilePhoto')};
    formBuilder = new (require('@angular/forms').UntypedFormBuilder)();

    component = new ProfileEditComponent(formBuilder, modalCtrlSpy, storeSpy, cameraSvcSpy);
  });

  it('builds a form with name and surname controls', () => {
    expect(component.profileForm.contains('name')).toBeTrue();
    expect(component.profileForm.contains('surname')).toBeTrue();
  });

  it('marks the form invalid when name is empty', () => {
    component.profileForm.patchValue({name: ''});
    expect(component.profileForm.invalid).toBeTrue();
  });

  it('marks the form valid when name is present and surname is empty (surname optional)', () => {
    component.profileForm.patchValue({name: 'Mario', surname: ''});
    expect(component.profileForm.valid).toBeTrue();
  });

  it('dismisses the modal via ModalController', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('dispatches updateUserProfile with form values on save', () => {
    component.profileForm.patchValue({name: 'Mario', surname: 'Rossi'});
    component.save();
    expect(storeSpy.dispatch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Esegui lo spec per verificare che fallisca**

Run: `cd core && npx ng test wm-core --include='**/profile-edit.component.spec.ts' --watch=false`
Expected: FAIL — `ProfileEditComponent` non esiste.

- [ ] **Step 3: Scrivi il componente**

```typescript
import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Photo} from '@capacitor/camera';
import {BehaviorSubject} from 'rxjs';
import {CameraService} from '@wm-core/services/camera.service';
import {updateUserProfile} from '@wm-core/store/auth/auth.actions';

export enum EProfileEditState {
  IDLE = 'IDLE',
  UPLOADING_PHOTO = 'UPLOADING_PHOTO',
  SAVING = 'SAVING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

@Component({
  standalone: false,
  selector: 'wm-profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileEditComponent implements OnInit {
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

  constructor(
    private _formBuilder: UntypedFormBuilder,
    private _modalCtrl: ModalController,
    private _store: Store,
    private _cameraSvc: CameraService,
  ) {
    this.profileForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      surname: ['', [Validators.maxLength(255)]],
    });
  }

  ngOnInit(): void {
    this.profileForm.patchValue({
      name: this.currentName ?? '',
      surname: this.currentSurname ?? '',
    });
  }

  dismiss(): void {
    this._modalCtrl.dismiss();
  }

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

  save(): void {
    this.submitted$.next(true);
    if (this.profileForm.invalid) {
      return;
    }

    this.state$.next(EProfileEditState.SAVING);
    this._store.dispatch(
      updateUserProfile({
        name: this.profileForm.value.name,
        surname: this.profileForm.value.surname || undefined,
        avatarPhoto: this.selectedPhoto ?? undefined,
      }),
    );
    // Nota: lo stato SUCCESS/ERROR effettivo va agganciato in Task 6 quando
    // profile-user.component osserva l'esito dell'azione (loadAuthsSuccess /
    // updateUserProfileFailure) e chiude il modale o mostra l'errore.
  }
}
```

- [ ] **Step 4: Scrivi il template**

```html
<wm-modal-header class="wm-profile-edit-header" [title]="'Modifica profilo' | wmtrans" (dismiss)="dismiss()">
</wm-modal-header>
<ion-content>
  <form class="wm-profile-edit-form" (ngSubmit)="save()" [formGroup]="profileForm">
    <div class="wm-profile-edit-avatar-container">
      <ion-avatar
        class="wm-profile-edit-avatar"
        (click)="pickPhoto()"
      >
        <img *ngIf="selectedPhoto?.webPath; else currentOrInitials" [src]="selectedPhoto.webPath" />
        <ng-template #currentOrInitials>
          <img *ngIf="currentAvatarUrl" [src]="currentAvatarUrl" />
          <div class="wm-profile-edit-avatar-initials" *ngIf="!currentAvatarUrl">
            {{ currentName | userInitials }}
          </div>
        </ng-template>
        <ion-spinner
          *ngIf="(state$|async) === EProfileEditState.UPLOADING_PHOTO"
          class="wm-profile-edit-avatar-spinner"
        ></ion-spinner>
      </ion-avatar>
      <button type="button" class="wm-profile-edit-avatar-change-button" (click)="pickPhoto()">
        {{ "Cambia foto" | wmtrans }}
      </button>
    </div>

    <div class="wm-profile-edit-field-container">
      <ion-label class="wm-profile-edit-label">{{ "Nome" | wmtrans }}</ion-label>
      <ion-item
        class="wm-profile-edit-field"
        [ngClass]="{
          'wm-profile-edit-field-has-error':
          (submitted$|async) && profileForm.controls.name.invalid
        }"
      >
        <ion-input type="text" formControlName="name" class="wm-profile-edit-input"></ion-input>
      </ion-item>
      <span
        class="wm-profile-edit-field-error"
        *ngIf="(submitted$|async) && profileForm.controls.name.errors?.required"
      >
        {{ "Il nome è obbligatorio" | wmtrans }}
      </span>
    </div>

    <div class="wm-profile-edit-field-container">
      <ion-label class="wm-profile-edit-label">{{ "Cognome" | wmtrans }}</ion-label>
      <ion-item class="wm-profile-edit-field">
        <ion-input type="text" formControlName="surname" class="wm-profile-edit-input"></ion-input>
      </ion-item>
    </div>

    <button
      type="submit"
      class="wm-profile-edit-save-button"
      [disabled]="(state$|async) === EProfileEditState.SAVING"
    >
      <ion-spinner *ngIf="(state$|async) === EProfileEditState.SAVING"></ion-spinner>
      <ng-container *ngIf="(state$|async) !== EProfileEditState.SAVING">
        {{ "Salva" | wmtrans }}
      </ng-container>
    </button>
  </form>
</ion-content>
```

- [ ] **Step 5: Scrivi lo scss minimale (touch target e spaziatura da requisito UX)**

```scss
.wm-profile-edit-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
}

.wm-profile-edit-avatar {
  width: 96px;
  height: 96px;
  position: relative;
}

.wm-profile-edit-avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wm-color-primary, #4285f4);
  color: #fff;
  font-size: 2rem;
  font-weight: 600;
}

.wm-profile-edit-avatar-spinner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.wm-profile-edit-avatar-change-button,
.wm-profile-edit-save-button {
  min-height: 44px;
  min-width: 44px;
}

.wm-profile-edit-field-container {
  margin-bottom: 8px;
}

.wm-profile-edit-field-has-error {
  --border-color: var(--wm-color-danger, #eb445a);
}

.wm-profile-edit-field-error {
  color: var(--wm-color-danger, #eb445a);
  font-size: 0.8rem;
}
```

- [ ] **Step 6: Registra il componente in `profile.module.ts`**

```typescript
import {ProfileEditComponent} from './profile-edit/profile-edit.component';
import {ReactiveFormsModule} from '@angular/forms';
import {WmPipeModule} from '../pipes/pipe.module';
```

```typescript
const components = [
  ProfileAuthComponent,
  ProfileUserComponent,
  ProfileDataComponent,
  WmProfilePopupComponent,
  ProfileEditComponent,
];
```

```typescript
@NgModule({
  declarations: components,
  imports: [CommonModule, IonicModule, WmPipeModule, WmSharedModule, ReactiveFormsModule],
  exports: components,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WmProfileModule {}
```

(`WmPipeModule` era già importato per `hasLogo`/altre pipe esistenti — verifica che sia già presente prima di aggiungerlo due volte; se assente, aggiungilo.)

- [ ] **Step 7: Esegui lo spec per verificare che passi**

Run: `cd core && npx ng test wm-core --include='**/profile-edit.component.spec.ts' --watch=false`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add projects/wm-core/src/profile/profile-edit/ projects/wm-core/src/profile/profile.module.ts
git commit -m "feat(oc:8163): add ProfileEditComponent modal for profile editing"
```

---

### Task 6: `profile-user.component` — avatar reale/iniziali + apertura modale

**Files:**
- Modify: `projects/wm-core/src/profile/profile-user/profile-user.component.ts`
- Modify: `projects/wm-core/src/profile/profile-user/profile-user.component.html`
- Modify: `projects/wm-core/src/profile/profile-user/profile-user.component.scss`

**Interfaces:**
- Consumes: `IUser.avatar_url`/`surname` (Task 1), `WmUserInitialsPipe` (Task 2), `ProfileEditComponent` (Task 5).

- [ ] **Step 1: Modifica il componente**

```typescript
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {from, Observable} from 'rxjs';
import {switchMap, take} from 'rxjs/operators';
import {IUser} from '@wm-core/store/auth/auth.model';
import {isLogged, user} from '@wm-core/store/auth/auth.selectors';
import {confAUTHEnable} from '@wm-core/store/conf/conf.selector';
import {ModalController} from '@ionic/angular';
import {ProfileEditComponent} from '@wm-core/profile/profile-edit/profile-edit.component';

@Component({
  standalone: false,
  selector: 'wm-profile-user',
  templateUrl: './profile-user.component.html',
  styleUrls: ['./profile-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileUserComponent {
  authEnable$: Observable<boolean> = this._store.select(confAUTHEnable);
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  user$: Observable<IUser> = this._store.pipe(select(user));

  constructor(
    private _store: Store,
    private _modalCtrl: ModalController,
  ) {}

  openEditProfile(currentUser: IUser): void {
    this.user$
      .pipe(
        take(1),
        switchMap(() =>
          from(
            this._modalCtrl.create({
              component: ProfileEditComponent,
              componentProps: {
                currentName: currentUser?.name,
                currentSurname: currentUser?.surname,
                currentAvatarUrl: currentUser?.avatar_url,
              },
              canDismiss: true,
              mode: 'ios',
              id: 'wm-profile-edit-modal',
            }),
          ),
        ),
      )
      .subscribe(modal => modal.present());
  }
}
```

Nota: `canDismiss: true` (non impostato a `false` o a una funzione bloccante) — Ionic gestisce già il dismiss su hardware back-button Android per i modali con questa configurazione, come verificato negli altri modali esistenti (`LoginComponent`, `ProfileAuthComponent`). Nessun codice aggiuntivo necessario per questo comportamento; verificare comunque su device/emulatore Android in fase di test manuale (Fase: execution).

- [ ] **Step 2: Modifica il template**

```html
<ng-container *ngIf="(isLogged$|async)">
  <div class="wm-profile-user-container" *ngIf="user$|async as currentUser" (click)="openEditProfile(currentUser)">
    <ion-avatar class="wm-profile-user-avatar">
      <img *ngIf="currentUser?.avatar_url" [src]="currentUser.avatar_url" />
      <div class="wm-profile-user-avatar-initials" *ngIf="!currentUser?.avatar_url">
        {{ currentUser?.name | userInitials }}
      </div>
    </ion-avatar>
    <div class="wm-profile-user-header-container">
      <h4 class="wm-profile-user-name">{{currentUser?.name}}</h4>
      <div class="wm-profile-user-email">{{currentUser?.email}}</div>
    </div>
  </div>
</ng-container>
```

Nota: `currentUser.name` viene mostrato così com'è, mai concatenato con `currentUser.surname` — vedi vincolo globale del piano.

- [ ] **Step 3: Aggiorna lo scss (sostituisci la vecchia regola `-avatar-icon`)**

Rimuovi (se presente) la regola scss legata a `.wm-profile-user-avatar-icon` (icona generica, non più usata) e aggiungi:

```scss
.wm-profile-user-container {
  cursor: pointer;
}

.wm-profile-user-avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wm-color-primary, #4285f4);
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
}
```

- [ ] **Step 4: Verifica manuale (non automatizzabile in questo task)**

Avvia l'app (`npm start` da `core/`), accedi con un utente di test, apri la pagina profilo:
- Verifica che l'header mostri le iniziali colorate se l'utente non ha avatar.
- Clicca sull'header e verifica che si apra il modale `ProfileEditComponent`.
- Compila nome/cognome, salva, verifica che l'header si aggiorni con i nuovi valori dopo la chiusura del modale (o mentre resta aperto, secondo l'implementazione dello stato SUCCESS — se non ancora agganciato, annotalo in `notes.md` come follow-up).

- [ ] **Step 5: Commit**

```bash
git add projects/wm-core/src/profile/profile-user/
git commit -m "feat(oc:8163): show real avatar or initials fallback in profile-user, open edit modal"
```

---

### Task 7: Traduzioni

**Files:**
- Modify: `projects/wm-core/src/localization/i18n/it.ts`
- Modify: `projects/wm-core/src/localization/i18n/en.ts`
- Modify: `projects/wm-core/src/localization/i18n/de.ts`
- Modify: `projects/wm-core/src/localization/i18n/es.ts`
- Modify: `projects/wm-core/src/localization/i18n/fr.ts`
- Modify: `projects/wm-core/src/localization/i18n/pr.ts`
- Modify: `projects/wm-core/src/localization/i18n/sq.ts`

**Interfaces:**
- Consumes: chiavi usate nel template di Task 5/6 (`'Modifica profilo'`, `'Cambia foto'`, `'Nome'`, `'Cognome'`, `'Il nome è obbligatorio'`, `'Salva'`, `"Origine dell'immagine"`, `'Scatta una foto'`, `'Dalla libreria'`, `'Annulla'` — questi ultimi 4 già esistenti in `it.ts` per `CameraService.addPhotos()`, verificare prima di duplicarli).

- [ ] **Step 1: Verifica quali chiavi esistono già**

```bash
grep -E "'Modifica profilo'|'Cambia foto'|'Nome'|'Cognome'|'Il nome è obbligatorio'|'Salva'" projects/wm-core/src/localization/i18n/it.ts
```

Aggiungi solo le chiavi mancanti nei passi successivi (`'Scatta una foto'`, `'Dalla libreria'`, `'Annulla'`, `"Origine dell'immagine"` risultano già presenti da `CameraService`, non duplicarle).

- [ ] **Step 2: Aggiungi le chiavi mancanti in `it.ts`**

```typescript
'Modifica profilo': 'Modifica profilo',
'Cambia foto': 'Cambia foto',
'Nome': 'Nome',
'Cognome': 'Cognome',
"Il nome è obbligatorio": "Il nome è obbligatorio",
'Salva': 'Salva',
```

(Se `'Nome'`/`'Salva'` risultano già presenti per altre feature, riusa la chiave esistente — non crearne una duplicata con lo stesso testo.)

- [ ] **Step 3: Aggiungi le traduzioni corrispondenti in `en.ts`, `de.ts`, `es.ts`, `fr.ts`, `pr.ts`, `sq.ts`**

Esempio per `en.ts`:

```typescript
'Modifica profilo': 'Edit profile',
'Cambia foto': 'Change photo',
'Nome': 'Name',
'Cognome': 'Surname',
"Il nome è obbligatorio": 'Name is required',
'Salva': 'Save',
```

Ripeti con traduzione appropriata per `de` (Tedesco), `es` (Spagnolo), `fr` (Francese), `pr` (Portoghese), `sq` (Albanese) — usa un traduttore o madrelingua per la revisione finale, i valori sopra sono un punto di partenza.

- [ ] **Step 4: Verifica che non manchino chiavi in nessun file**

```bash
for f in it en de es fr pr sq; do
  echo "=== $f ==="
  grep -c "'Modifica profilo'" projects/wm-core/src/localization/i18n/$f.ts
done
```

Expected: `1` per ognuno dei 7 file.

- [ ] **Step 5: Commit**

```bash
git add projects/wm-core/src/localization/i18n/*.ts
git commit -m "feat(oc:8163): add profile edit translations for all 7 languages"
```

---

## Self-Review Checklist (compilata dall'autore del piano)

- **Spec coverage:** `IUser` esteso (Task 1), fallback iniziali (Task 2), store/multipart (Task 3), upload foto dedicato + limite dimensione (Task 4), modale edit con tutti i requisiti UX (Task 5), integrazione in `profile-user` (Task 6), traduzioni (Task 7) — tutti i requisiti di `overview.md` sono coperti. Il rischio "test Cypress `login-offline.cy.ts`" resta una verifica manuale in Fase: execution, non un task di questo piano (repo `webmapp-app`, fuori da questo piano wm-core).
- **Placeholder scan:** nessun TODO; Task 6 Step 4 è una verifica manuale dichiarata esplicitamente come tale, non un placeholder di codice.
- **Type consistency:** `EProfileEditState` (Task 5) usato coerentemente in `.ts` e `.html`; `updateUserProfile({name?, surname?, avatarPhoto?})` (Task 3) ha la stessa forma in `auth.actions.ts`, `auth.service.ts` e nella chiamata `save()` di `ProfileEditComponent` (Task 5); `WmUserInitialsPipe`/`userInitials` (Task 2) nome pipe coerente tra dichiarazione e uso nei template (Task 5, Task 6).

## Execution Handoff

Piano salvato in `docs/features/8163-profilo-utente-nome-cognome-avatar/plan.md`. Due opzioni di esecuzione:

**1. Subagent-Driven (consigliato)** — un subagente fresco per task, review tra un task e l'altro, iterazione rapida.

**2. Inline Execution** — esecuzione in questa sessione con `executing-plans`, batch execution con checkpoint.

Quale preferisci?
