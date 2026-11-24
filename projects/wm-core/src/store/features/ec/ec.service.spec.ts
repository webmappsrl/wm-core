import {HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';

import {EcService} from './ec.service';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {synchronizedEctrack} from '@wm-core/utils/localForage';
import {adaptTrackToCurrentVersion} from '@wm-core/utils/aws-version-adapter';
import unversionedFixture from '@wm-core/utils/fixtures/aws-version-adapter/forestasdev-769-unversioned.json';
import geohubFixture from '@wm-core/utils/fixtures/aws-version-adapter/geohub-100-unversioned.json';

describe('EcService - getEcTrack (offline cache behaviour)', () => {
  let service: EcService;
  let httpClientSpy: any;
  let environmentMock: any;

  const createMockTrack = (id: number): WmFeature<LineString> => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [11.0, 46.0],
        [11.1, 46.1],
      ],
    },
    properties: {
      id,
      name: 'Test track',
    } as any,
  });

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    environmentMock = {
      awsApi: 'https://test-aws.com',
      awsVersions: {},
      elasticApi: 'https://elastic.test',
      appId: null,
    };
    const langServiceMock: any = {
      defaultLang: 'it',
      currentLang: 'it',
      getLangs: () => ['it', 'en'],
    };

    // Pulisce lo store delle ec-tracks prima di ogni test
    await synchronizedEctrack.clear();

    service = new EcService(httpClientSpy, environmentMock, langServiceMock);
  });

  it('dovrebbe emettere la track da cache e non andare in errore se la HTTP fallisce ma esiste cachedTrack', async () => {
    const cachedTrack = createMockTrack(123);
    await synchronizedEctrack.setItem('123', cachedTrack);

    // Simula errore HTTP
    httpClientSpy.get.and.returnValue(
      throwError(() => new Error('Server error')),
    );

    const emissions: WmFeature<LineString>[] = [];
    let error: any = null;

    await new Promise<void>(resolve => {
      service.getEcTrack(123).subscribe({
        next: value => emissions.push(value),
        error: e => {
          error = e;
          resolve();
        },
        complete: () => resolve(),
      });
    });

    // Deve aver emesso solo la track in cache
    expect(emissions.length).toBe(1);
    // La copia senza awsVersion esce normalizzata in forma v1
    expect(emissions[0]).toEqual(adaptTrackToCurrentVersion(cachedTrack, undefined)!.track);
    // Nessun errore propagato allo stream
    expect(error).toBeNull();
  });

  it('dovrebbe emettere solo la track remota e non salvare nel localForage se non esiste cachedTrack', async () => {
    const remoteTrack = createMockTrack(456);

    // Nessuna track salvata in cache per questo id
    const httpResponse = new HttpResponse({
      status: 200,
      body: remoteTrack,
      headers: new HttpHeaders(),
    });
    httpClientSpy.get.and.returnValue(of(httpResponse));

    const emissions: WmFeature<LineString>[] = [];
    let error: any = null;

    await new Promise<void>(resolve => {
      service.getEcTrack(456).subscribe({
        next: value => emissions.push(value),
        error: e => {
          error = e;
          resolve();
        },
        complete: () => resolve(),
      });
    });

    // Deve aver emesso solo la track remota
    expect(emissions.length).toBe(1);
    expect(emissions[0]).toEqual(adaptTrackToCurrentVersion(remoteTrack, undefined)!.track);
    expect(error).toBeNull();

    // Verifica che la track non sia stata salvata nel localForage
    const stored = await synchronizedEctrack.getItem('456');
    expect(stored).toBeNull();
  });
  describe('versione della traccia (oc:8998)', () => {
    const asTrack = (json: unknown): WmFeature<LineString> =>
      JSON.parse(JSON.stringify(json)) as WmFeature<LineString>;

    const okResponse = (body: WmFeature<LineString>) =>
      of(new HttpResponse({status: 200, body, headers: new HttpHeaders()}));

    const collect = <T>(obs: any): Promise<{emissions: T[]; error: any}> =>
      new Promise(resolve => {
        const emissions: T[] = [];
        obs.subscribe({
          next: (value: T) => emissions.push(value),
          error: (error: any) => resolve({emissions, error}),
          complete: () => resolve({emissions, error: null}),
        });
      });

    it('con lo shard in v1 scarica tracks/v1/<id>.json', async () => {
      environmentMock.awsVersions = {tracks: 'v1'};
      httpClientSpy.get.and.returnValue(okResponse(asTrack(unversionedFixture)));

      await collect(service.getEcTrackWithIcons(769));

      expect(httpClientSpy.get).toHaveBeenCalledTimes(1);
      expect(httpClientSpy.get.calls.mostRecent().args[0]).toBe('https://test-aws.com/tracks/v1/769.json');
    });

    it('senza dichiarazione scarica tracks/<id>.json', async () => {
      environmentMock.awsVersions = {};
      httpClientSpy.get.and.returnValue(okResponse(asTrack(geohubFixture)));

      await collect(service.getEcTrackWithIcons(100));

      expect(httpClientSpy.get).toHaveBeenCalledTimes(1);
      expect(httpClientSpy.get.calls.mostRecent().args[0]).toBe('https://test-aws.com/tracks/100.json');
    });

    it('la risposta senza versione esce in forma v1', async () => {
      environmentMock.awsVersions = {};
      httpClientSpy.get.and.returnValue(okResponse(asTrack(geohubFixture)));

      const {emissions, error} = await collect<any>(service.getEcTrackWithIcons(100));

      expect(error).toBeNull();
      expect(emissions.length).toBe(1);
      const props: any = emissions[0].track.properties;
      expect(props.taxonomy).toBeUndefined();
      expect(props.taxonomies.activity).toBeDefined();
    });

    it('una copia offline senza awsVersion viene normalizzata anche con lo shard in v1', async () => {
      environmentMock.awsVersions = {tracks: 'v1'};
      await synchronizedEctrack.setItem('769', asTrack(unversionedFixture));
      httpClientSpy.get.and.returnValue(throwError(() => new Error('offline')));

      const {emissions, error} = await collect<any>(service.getEcTrackWithIcons(769));

      expect(error).toBeNull();
      expect(emissions.length).toBe(1);
      const props: any = emissions[0].track.properties;
      expect(props.taxonomy_where).toBeUndefined();
      expect(props.taxonomy).toBeUndefined();
      expect(emissions[0].track.awsVersion).toBeUndefined();
    });

    it('aggiornando la copia salva la traccia adattata', async () => {
      environmentMock.awsVersions = {};
      await synchronizedEctrack.setItem('100', asTrack(geohubFixture));
      httpClientSpy.get.and.returnValue(okResponse(asTrack(geohubFixture)));

      await collect(service.getEcTrackWithIcons(100));
      // Il salvataggio è asincrono e non attendibile dallo stream: lo si aspetta sullo store
      let stored: any = null;
      for (let i = 0; i < 50; i++) {
        stored = await synchronizedEctrack.getItem('100');
        if (stored?.awsVersion) break;
        await new Promise(r => setTimeout(r, 20));
      }

      expect(stored).not.toBeNull();
      expect(stored.awsVersion).toBe('v1');
      expect(stored.properties.taxonomy).toBeUndefined();
      expect(stored.properties.taxonomies.activity).toBeDefined();
      // Gli SVG inline tolti dall'adapter restano con la copia, per l'uso offline
      expect(stored.icons).toEqual({'txn-hiking': (geohubFixture as any).properties.taxonomy.activity[0].icon});
    });

    it('una copia v1 offline restituisce le icone salvate con lei', async () => {
      environmentMock.awsVersions = {};
      const adapted = adaptTrackToCurrentVersion(asTrack(geohubFixture), undefined)!;
      await synchronizedEctrack.setItem('100', {...adapted.track, awsVersion: 'v1', icons: adapted.icons});
      httpClientSpy.get.and.returnValue(throwError(() => new Error('offline')));

      const {emissions, error} = await collect<any>(service.getEcTrackWithIcons(100));

      expect(error).toBeNull();
      expect(emissions.length).toBe(1);
      expect(emissions[0].icons).toEqual(adapted.icons);
      expect(emissions[0].track.icons).toBeUndefined();
      expect(emissions[0].track.awsVersion).toBeUndefined();
    });

    it('getEcTrack emette solo la traccia', async () => {
      environmentMock.awsVersions = {};
      httpClientSpy.get.and.returnValue(okResponse(asTrack(geohubFixture)));

      const {emissions} = await collect<any>(service.getEcTrack(100));

      expect(emissions.length).toBe(1);
      expect(emissions[0].icons).toBeUndefined();
      expect(emissions[0].type).toBe('Feature');
    });

    it('un 404 su v1 non riprova sul file senza versione', async () => {
      environmentMock.awsVersions = {tracks: 'v1'};
      httpClientSpy.get.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 404, url: 'https://test-aws.com/tracks/v1/769.json'})),
      );

      const {emissions, error} = await collect<any>(service.getEcTrackWithIcons(769));

      expect(emissions.length).toBe(0);
      expect(error.status).toBe(404);
      expect(httpClientSpy.get).toHaveBeenCalledTimes(1);
      expect(httpClientSpy.get.calls.mostRecent().args[0]).toBe('https://test-aws.com/tracks/v1/769.json');
    });
  });
});


