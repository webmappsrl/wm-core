import {UntypedFormBuilder} from '@angular/forms';
import {Actions} from '@ngrx/effects';
import {Subject} from 'rxjs';
import {Action} from '@ngrx/store';

import * as AuthActions from '@wm-core/store/auth/auth.actions';
import {EProfileEditState, ProfileEditComponent} from './profile-edit.component';

/**
 * `ProfileEditComponent` is exercised as a plain TS class (no `TestBed`, no template
 * compilation): its template uses `wmtrans`/Ionic components whose DI chain
 * (`APP_TRANSLATION`) is not wired up outside the full app module and has previously
 * caused `NG0201` crashes in boilerplate specs (see wm-core CLAUDE.md, oc:8023, and the
 * same pattern in `ugc-track-properties.component.spec.ts`, oc:8183). Instantiating the
 * class directly with mocked constructor dependencies avoids Angular's compiler/DI
 * entirely while still covering the form validation and save/dismiss logic, none of which
 * depends on the rendered template.
 *
 * `Actions` (from `@ngrx/effects`) is a real `Observable` subclass whose constructor
 * accepts a source `Observable<Action>` (see `node_modules/@ngrx/effects/.../ngrx-effects.mjs`)
 * — a `Subject<Action>` fed manually in each test stands in for the real actions stream
 * without needing `TestBed`/`EffectsModule`.
 */
describe('ProfileEditComponent', () => {
  let component: ProfileEditComponent;
  let modalCtrlSpy: any;
  let storeSpy: any;
  let cameraSvcSpy: any;
  let alertCtrlSpy: any;
  let langSvcSpy: any;
  let formBuilder: any;
  let actionsSubject: Subject<Action>;
  let actions$: Actions;

  beforeEach(() => {
    modalCtrlSpy = {dismiss: jasmine.createSpy('dismiss')};
    storeSpy = {
      dispatch: jasmine.createSpy('dispatch'),
      pipe: () => ({subscribe: () => {}}),
      select: () => ({pipe: () => ({subscribe: () => {}})}),
    };
    cameraSvcSpy = {addProfilePhoto: jasmine.createSpy('addProfilePhoto')};
    alertCtrlSpy = {
      create: jasmine.createSpy('create').and.returnValue(
        Promise.resolve({present: jasmine.createSpy('present')}),
      ),
    };
    langSvcSpy = {instant: jasmine.createSpy('instant').and.callFake((s: string) => s)};
    formBuilder = new UntypedFormBuilder();
    actionsSubject = new Subject<Action>();
    actions$ = new Actions(actionsSubject);

    component = new ProfileEditComponent(
      formBuilder,
      modalCtrlSpy,
      storeSpy,
      cameraSvcSpy,
      actions$,
      alertCtrlSpy,
      langSvcSpy,
    );
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

  it('sends surname: "" (not undefined) when an existing surname is cleared and saved', () => {
    component.profileForm.patchValue({name: 'Mario', surname: 'Rossi'});
    component.profileForm.patchValue({surname: ''});
    component.save();
    expect(storeSpy.dispatch).toHaveBeenCalledWith(
      jasmine.objectContaining({
        surname: '',
      }),
    );
  });

  it('transitions to SUCCESS and dismisses the modal when loadAuthsSuccess fires after save', () => {
    component.profileForm.patchValue({name: 'Mario', surname: 'Rossi'});
    component.save();
    expect(component.state$.value).toBe(EProfileEditState.SAVING);

    actionsSubject.next(AuthActions.loadAuthsSuccess({user: {} as any}));

    expect(component.state$.value).toBe(EProfileEditState.SUCCESS);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('transitions to ERROR and shows an alert when updateUserProfileFailure fires after save', () => {
    component.profileForm.patchValue({name: 'Mario', surname: 'Rossi'});
    component.save();

    actionsSubject.next(AuthActions.updateUserProfileFailure({error: {} as any}));

    expect(component.state$.value).toBe(EProfileEditState.ERROR);
    expect(alertCtrlSpy.create).toHaveBeenCalled();
  });
});
