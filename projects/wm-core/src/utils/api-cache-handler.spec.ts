import {HttpClient, HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';
import {handleApiCache} from './api-cache-handler';
import {synchronizedApi} from './localForage';

describe('handleApiCache', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('does not send If-Modified-Since header when cache is empty (cache miss)', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-cache-miss.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(
        of(new HttpResponse({status: 200, body: {foo: 'bar'}, headers: new HttpHeaders()})),
      );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('does not send If-Modified-Since header when cached data is corrupted (JSON.parse fails)', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve('not-valid-json{'));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-corrupted-cache.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(
        of(new HttpResponse({status: 200, body: {foo: 'bar'}, headers: new HttpHeaders()})),
      );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('still sends If-Modified-Since header when a valid cache entry exists', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({foo: 'cached'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-valid-cache.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(of(new HttpResponse({status: 304, headers: new HttpHeaders()})));
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBe('Wed, 01 Jan 2025 00:00:00 GMT');
        done();
      },
    });
  });

  it('ignores a valid cache entry and does not send If-Modified-Since when forceFreshRequest is true', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({foo: 'cached'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-force-fresh.json';
    localStorage.setItem(`${url}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const httpGetSpy = jasmine
      .createSpy('get')
      .and.returnValue(
        of(new HttpResponse({status: 200, body: {foo: 'fresh'}, headers: new HttpHeaders()})),
      );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url, undefined, {}, true).subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('does not write last-modified to localStorage when synchronizedApi.setItem rejects', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.reject(new Error('quota exceeded')));
    const url = 'http://x/conf-setitem-fail.json';

    const httpGetSpy = jasmine.createSpy('get').and.returnValue(
      of(
        new HttpResponse({
          status: 200,
          body: {foo: 'bar'},
          headers: new HttpHeaders({'last-modified': 'Thu, 02 Jan 2025 00:00:00 GMT'}),
        }),
      ),
    );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      next: data => {
        expect(data).toEqual({foo: 'bar'});
      },
      complete: () => {
        expect(localStorage.getItem(`${url}-last-modified`)).toBeNull();
        done();
      },
    });
  });

  it('writes last-modified to localStorage when synchronizedApi.setItem succeeds', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    const url = 'http://x/conf-setitem-success.json';

    const httpGetSpy = jasmine.createSpy('get').and.returnValue(
      of(
        new HttpResponse({
          status: 200,
          body: {foo: 'bar'},
          headers: new HttpHeaders({'last-modified': 'Thu, 02 Jan 2025 00:00:00 GMT'}),
        }),
      ),
    );
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    handleApiCache(httpMock, url).subscribe({
      next: data => {
        expect(data).toEqual({foo: 'bar'});
      },
      complete: () => {
        expect(localStorage.getItem(`${url}-last-modified`)).toBe('Thu, 02 Jan 2025 00:00:00 GMT');
        done();
      },
    });
  });
});
