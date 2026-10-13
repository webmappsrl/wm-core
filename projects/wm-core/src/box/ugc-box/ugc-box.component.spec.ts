import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {BehaviorSubject, of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {openUgcUploader} from '@wm-core/store/user-activity/user-activity.action';
import {FAKE_BOX_PIPES} from '../box-template.spec-support';
import {UgcBoxComponent} from './ugc-box.component';

describe('UgcBoxComponent (default) — bottone di import da file (oc:8764)', () => {
  let logged$: BehaviorSubject<boolean>;
  let store: {select: (sel: unknown) => unknown; dispatch: jasmine.Spy};
  let fixture: ComponentFixture<UgcBoxComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    logged$ = new BehaviorSubject(true);
    store = {
      select: (sel: unknown) => {
        if (sel === isLogged) {
          return logged$;
        }
        if (sel === ugcOpened) {
          return of(true);
        }
        return of(null);
      },
      dispatch: jasmine.createSpy('dispatch'),
    };
    await TestBed.configureTestingModule({
      declarations: [UgcBoxComponent, ...FAKE_BOX_PIPES],
      providers: [
        {provide: Store, useValue: store},
        {provide: LangService, useValue: {onLangChange: of()}},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(UgcBoxComponent);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('mostra il bottone con utente loggato e UGC aperto, e il click apre l\'uploader', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');

    expect(button).not.toBeNull();
    button.click();
    expect(store.dispatch).toHaveBeenCalledWith(openUgcUploader());
  });

  it('non mostra il bottone con utente non loggato', () => {
    logged$.next(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-button')).toBeNull();
  });
});
