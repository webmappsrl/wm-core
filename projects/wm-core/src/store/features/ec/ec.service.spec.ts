import {HttpClient} from '@angular/common/http';
import {of, throwError} from 'rxjs';

import {EcService} from './ec.service';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {synchronizedEctrack} from '@wm-core/utils/localForage';

describe('EcService - getEcTrack (offline cache behaviour)', () => {
  let service: EcService;
  let httpClientSpy: any;

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
    const environmentMock: any = {
      awsApi: 'https://test-aws.com',
      elasticApi: 'https://elastic.test',
      appId: null,
    };

    // Pulisce lo store delle ec-tracks prima di ogni test
    await synchronizedEctrack.clear();

    service = new EcService(httpClientSpy, environmentMock);
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
    expect(emissions[0]).toEqual(cachedTrack);
    // Nessun errore propagato allo stream
    expect(error).toBeNull();
  });

  it('dovrebbe emettere solo la track remota e non salvare nel localForage se non esiste cachedTrack', async () => {
    const remoteTrack = createMockTrack(456);

    // Nessuna track salvata in cache per questo id
    httpClientSpy.get.and.returnValue(of(remoteTrack));

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
    expect(emissions[0]).toEqual(remoteTrack);
    expect(error).toBeNull();

    // Verifica che la track non sia stata salvata nel localForage
    const stored = await synchronizedEctrack.getItem('456');
    expect(stored).toBeNull();
  });
});


