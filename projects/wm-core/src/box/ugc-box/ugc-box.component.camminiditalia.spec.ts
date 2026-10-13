import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {BehaviorSubject, of} from 'rxjs';
import {LangService} from '@wm-core/localization/lang.service';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {FAKE_BOX_PIPES} from '../box-template.spec-support';
import {UgcBoxComponent} from './ugc-box.component.camminiditalia';

describe('UgcBoxComponent (camminiditalia) — import da file tolto (oc:8764)', () => {
  let needsPrivacy$: BehaviorSubject<boolean>;
  let fixture: ComponentFixture<UgcBoxComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    needsPrivacy$ = new BehaviorSubject(false);
    const store = {
      select: (sel: unknown) => {
        // Utente loggato con «I miei percorsi» aperto: è il caso in cui il default mostra il bottone.
        if (sel === isLogged || sel === ugcOpened) {
          return of(true);
        }
        if (sel === needsPrivacyAgree) {
          return needsPrivacy$;
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

  it('non mostra il bottone di import con utente loggato e UGC aperto', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-button')).toBeNull();
  });

  it('mostra ancora il bottone della privacy', () => {
    needsPrivacy$.next(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('wm-privacy-agree-button')).not.toBeNull();
  });

  it('mostra il titolo «I miei percorsi»', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.wm-box-title').textContent).toContain(
      'I miei percorsi',
    );
  });
});
