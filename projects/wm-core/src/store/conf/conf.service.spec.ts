import {HttpClient, HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';
import {ConfService} from './conf.service';
import {DeviceService} from '@wm-core/services/device.service';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {synchronizedApi} from '@wm-core/utils/localForage';

describe('ConfService — getConf() conditional header regression (oc:8374)', () => {
  const confUrl = 'https://example.com/api/app/webmapp/1/config';

  afterEach(() => {
    localStorage.clear();
  });

  function buildService(shardName: string): {service: ConfService; httpGetSpy: jasmine.Spy} {
    const httpGetSpy = jasmine.createSpy('get');
    const httpMock = {get: httpGetSpy} as unknown as HttpClient;

    const deviceStub = {isMobile: false} as unknown as DeviceService;
    const environmentStub = {
      confUrl,
      shardName,
      appId: 1,
    } as unknown as EnvironmentService;

    const service = new ConfService(httpMock, deviceStub, environmentStub);
    return {service, httpGetSpy};
  }

  it('does not send If-Modified-Since for a non-carg shard when cache is empty', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    localStorage.setItem(`${confUrl}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const {service, httpGetSpy} = buildService('geohub');
    httpGetSpy.and.returnValue(
      of(new HttpResponse({status: 200, body: {some: 'conf'}, headers: new HttpHeaders()})),
    );

    service.getConf().subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });

  it('still sends If-Modified-Since for a non-carg shard when a valid cache entry exists', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({some: 'cached-conf'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    localStorage.setItem(`${confUrl}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const {service, httpGetSpy} = buildService('geohub');
    httpGetSpy.and.returnValue(of(new HttpResponse({status: 304, headers: new HttpHeaders()})));

    service.getConf().subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBe('Wed, 01 Jan 2025 00:00:00 GMT');
        done();
      },
    });
  });

  it('never sends If-Modified-Since for the carg shard, even with a valid cache entry (existing behavior preserved)', done => {
    spyOn(synchronizedApi, 'getItem').and.returnValue(
      Promise.resolve(JSON.stringify({some: 'cached-conf'})),
    );
    spyOn(synchronizedApi, 'setItem').and.returnValue(Promise.resolve());
    localStorage.setItem(`${confUrl}-last-modified`, 'Wed, 01 Jan 2025 00:00:00 GMT');

    const {service, httpGetSpy} = buildService('carg');
    httpGetSpy.and.returnValue(
      of(new HttpResponse({status: 200, body: {some: 'fresh-conf'}, headers: new HttpHeaders()})),
    );

    service.getConf().subscribe({
      complete: () => {
        const callArgs = httpGetSpy.calls.mostRecent().args[1];
        expect(callArgs.headers['If-Modified-Since']).toBeUndefined();
        done();
      },
    });
  });
});
