import {ChangeDetectorRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';

import {LangService} from '../localization/lang.service';
import {WmTransPipe} from './wmtrans.pipe';

describe('WmTransPipe', () => {
  let pipe: WmTransPipe;
  let langSvcMock: Partial<LangService>;
  let cdrMock: jasmine.SpyObj<ChangeDetectorRef>;
  let langChange$: Subject<void>;

  beforeEach(() => {
    langChange$ = new Subject<void>();
    cdrMock = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);

    langSvcMock = {
      instant: jasmine.createSpy('instant').and.callFake((key: string) => `tr:${key}`),
      get currentLang() {
        return 'it';
      },
      get defaultLang() {
        return 'en';
      },
      onLangChange: langChange$.asObservable() as any,
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: LangService, useValue: langSvcMock},
        {provide: ChangeDetectorRef, useValue: cdrMock},
      ],
    });

    const lang = TestBed.inject(LangService);
    const cdr = TestBed.inject(ChangeDetectorRef);
    pipe = new WmTransPipe(lang, cdr);
  });

  it('dovrebbe essere creato', () => {
    expect(pipe).toBeTruthy();
  });

  it('dovrebbe restituire il valore per la lingua corrente se presente', () => {
    const value = {it: 'Ciao', en: 'Hello'};
    const result = pipe.transform(value);
    expect(result).toBe('Ciao');
  });

  it('dovrebbe fare fallback alla defaultLang se la lingua corrente non esiste', () => {
    const value = {en: 'Hello'};
    const result = pipe.transform(value);
    expect(result).toBe('Hello');
  });

  it('dovrebbe usare LangService.instant quando value è una stringa semplice', () => {
    const result = pipe.transform('update.new_version_available');
    expect((langSvcMock.instant as jasmine.Spy).calls.count()).toBe(1);
    expect((langSvcMock.instant as jasmine.Spy).calls.mostRecent().args[0]).toBe(
      'update.new_version_available',
    );
    expect(result).toBe('tr:update.new_version_available');
  });

  it('dovrebbe restituire stringa vuota per value falsy', () => {
    expect(pipe.transform(null as any)).toBe('');
    expect(pipe.transform(undefined as any)).toBe('');
  });

  it('dovrebbe chiamare markForCheck su cambio lingua', () => {
    langChange$.next();
    expect(cdrMock.markForCheck).toHaveBeenCalled();
  });
});

