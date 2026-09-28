import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {TranslateModule} from '@ngx-translate/core';
import {NEVER, of} from 'rxjs';
import {APP_TRANSLATION} from '@wm-core/store/conf/conf.token';
import {DeviceService} from '@wm-core/services/device.service';
import {LangService} from './lang.service';

describe('LangService.instant — interpolazione (oc:8166)', () => {
  let svc: LangService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        LangService,
        {provide: APP_TRANSLATION, useValue: {}},
        {provide: DeviceService, useValue: {getLanguageCode$: () => of('it')}},
        {provide: Store, useValue: {select: () => NEVER}},
      ],
    });
    svc = TestBed.inject(LangService);
    svc.setTranslation('it', {'passport.test': '{{percent}}% completato'}, true);
    svc.use('it');
  });

  afterEach(() => TestBed.resetTestingModule());

  it('sostituisce i parametri di una chiave stringa', () => {
    expect(svc.instant('passport.test', {percent: 64})).toBe('64% completato');
  });

  it('senza parametri restituisce la traduzione come prima', () => {
    expect(svc.instant('passport.test')).toBe('{{percent}}% completato');
  });
});
