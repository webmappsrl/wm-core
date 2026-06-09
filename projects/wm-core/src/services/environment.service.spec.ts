import {TestBed} from '@angular/core/testing';
import {EnvironmentService} from './environment.service';

describe('EnvironmentService — _wmpackagesRegex', () => {
  let service: EnvironmentService;
  let regex: RegExp;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [EnvironmentService]});
    service = TestBed.inject(EnvironmentService);
    regex = (service as any)._wmpackagesRegex as RegExp;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should define _wmpackagesRegex', () => {
    expect(regex).toBeDefined();
    expect(regex).toBeInstanceOf(RegExp);
  });

  it('should match 4-part hostname (surge.sh)', () => {
    const m = '1.camminiditalia.surge.sh'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match 4-part hostname (webmapp.it)', () => {
    const m = '1.camminiditalia.webmapp.it'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match 4-part hostname with .mobile', () => {
    const m = '1.camminiditalia.mobile.webmapp.it'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match 5-part Surge preview hostname', () => {
    const m = '1.camminiditalia.pr-53.surge.sh'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match with multi-digit appId', () => {
    const m = '123.myapp.pr-100.surge.sh'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('123');
    expect(m![2]).toBe('myapp');
  });

  it('should not match hostname without numeric appId prefix', () => {
    expect('app.webmapp.it'.match(regex)).toBeNull();
  });

  it('should not match hostname starting with text', () => {
    expect('geohub.webmapp.it'.match(regex)).toBeNull();
  });

  it('should not match localhost', () => {
    expect('localhost'.match(regex)).toBeNull();
  });

  it('should not match bare domain without dots', () => {
    expect('webmapp'.match(regex)).toBeNull();
  });
});
