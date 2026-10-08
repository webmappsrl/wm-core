import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {Store} from '@ngrx/store';
import {of} from 'rxjs';

import {UgcService} from './ugc.service';
import {removedSynchronizedUgc} from './ugc.actions';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {
  synchronizedImg,
  synchronizedUgcPoi,
  synchronizedUgcTrack,
} from '@wm-core/utils/localForage';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';

const createMockFeature = (properties: any = {}): WmFeature<Point> => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [11.123, 45.456]
  },
  properties: {
    id: 1,
    name: 'Test POI',
    ...properties
  }
});

const createMockMedia = (mediaProps: any = {}): any => ({
  webPath: 'test-image-1.jpg',
  ...mediaProps
});

const createMockExif = (exifProps: any = {}): any => ({
  Make: 'Test Camera',
  Model: 'Test Model',
  ...exifProps
});

const createDirtyExif = () => ({
  Make: 'Test\u0000Camera\u0001\u0002',
  Model: 'Test\u007FModel\u009F',
  Software: 'Test\u001FSoftware',
  Artist: 'Test Artist'
});

const verifyFormDataFeature = (formData: FormData) => {
  expect(formData).toBeInstanceOf(FormData);
  expect(formData.get('feature')).toBeTruthy();
};

const verifyFormDataImages = (formData: FormData, expectedCount: number) => {
  expect(formData.getAll('images[]').length).toBe(expectedCount);
  if (expectedCount > 0) {
    expect(formData.get('images[]')).toBeInstanceOf(Blob);
  }
};

const verifyCleanExif = (parsedFeature: any) => {
  expect(parsedFeature.properties.media[0].exif.Make).toBe('TestCamera');
  expect(parsedFeature.properties.media[0].exif.Model).toBe('TestModel');
  expect(parsedFeature.properties.media[0].exif.Software).toBe('TestSoftware');
  expect(parsedFeature.properties.media[0].exif.Artist).toBe('Test Artist');
};

let httpMock: HttpTestingController;
let service: UgcService;
let mockStore: jasmine.SpyObj<Store>;
let mockEnvironmentService: jasmine.SpyObj<EnvironmentService>;

beforeEach(() => {
  TestBed.resetTestingModule();
  const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
  const environmentSpy = jasmine.createSpyObj('EnvironmentService', [], {
    origin: 'https://test-api.com'
  });

  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [
      UgcService,
      {provide: Store, useValue: storeSpy},
      {provide: EnvironmentService, useValue: environmentSpy},
    ]
  });

  service = TestBed.inject(UgcService);
  mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  mockEnvironmentService = TestBed.inject(EnvironmentService) as jasmine.SpyObj<EnvironmentService>;
  httpMock = TestBed.inject(HttpTestingController);

  mockStore.select.and.returnValue(of(true));
});

afterEach(() => {
  httpMock.verify();
  TestBed.resetTestingModule();
});

describe('UgcService', () => {
  describe('_cleanExifData', () => {
    it('should clean EXIF data with invalid Unicode characters correctly', () => {
      const mockFeature = createMockFeature({
        name: 'Test POI with dirty EXIF',
        media: [createMockMedia({exif: createDirtyExif()})]
      });

      const result = (service as any)._cleanExifData(mockFeature);

      verifyCleanExif(result);
    });

    it('should handle features without media', () => {
      const mockFeature = createMockFeature({
        name: 'Test POI without media'
      });

      const result = (service as any)._cleanExifData(mockFeature);

      expect(result).toEqual(mockFeature);
    });

    it('should handle media without EXIF data', () => {
      const mockFeature = createMockFeature({
        name: 'Test POI with media without EXIF',
        media: [createMockMedia()]
      });

      const result = (service as any)._cleanExifData(mockFeature);

      expect(result).toEqual(mockFeature);
    });
  });

  describe('_buildFormData', () => {
    it('should create FormData with cleaned feature and images', async () => {
      const mockFeature = createMockFeature({
        media: [
          createMockMedia({exif: createMockExif()}),
          createMockMedia({
            webPath: 'test-image-2.jpg',
            exif: createMockExif()
          })
        ],
        url: 'test-url.jpg'
      });

      const result = await (service as any)._buildFormData(mockFeature);

      verifyFormDataFeature(result);
      verifyFormDataImages(result, 2);

      const parsedFeature = JSON.parse(result.get('feature') as string);
      expect(parsedFeature.properties.media[0].exif.Make).toBe('Test Camera');
      expect(parsedFeature.properties.media[0].exif.Model).toBe('Test Model');
    });

    it('should handle features without media', async () => {
      const mockFeature = createMockFeature({
        name: 'Test POI without media'
      });

      const result = await (service as any)._buildFormData(mockFeature);

      verifyFormDataFeature(result);
      verifyFormDataImages(result, 0);
    });

    it('should handle features with media that have id (already synchronized)', async () => {
      const mockFeature = createMockFeature({
        name: 'Test POI with synchronized media',
        media: [
          createMockMedia({id: 123}), // Media già sincronizzato
          createMockMedia({webPath: 'test-image-2.jpg'}) // Media non sincronizzato
        ]
      });

      const result = await (service as any)._buildFormData(mockFeature);

      verifyFormDataFeature(result);
      verifyFormDataImages(result, 1); // Solo l'immagine senza id
    });

    it('should clean EXIF data with invalid Unicode characters correctly', async () => {
      const mockFeature = createMockFeature({
        name: 'Test POI with dirty EXIF',
        media: [createMockMedia({exif: createDirtyExif()})]
      });

      const result = await (service as any)._buildFormData(mockFeature);

      const parsedFeature = JSON.parse(result.get('feature') as string);
      verifyCleanExif(parsedFeature);
    });
  });

  describe('saveApiPoi', () => {
    it('should return null for null POI', async () => {
      const result = await service.saveApiPoi(null as any);
      expect(result).toBeNull();
    });
  });

  describe('riconciliazione (oc:8741)', () => {
    const track = (id: any, webPaths: string[] = [], uuid = `uuid-${id}`): any => ({
      type: 'Feature',
      geometry: {type: 'LineString', coordinates: []},
      properties: {id, uuid, media: webPaths.map(webPath => ({webPath}))},
    });
    const poi = (id: any, webPaths: string[] = []): any => ({
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [0, 0]},
      properties: {id, uuid: `poi-${id}`, media: webPaths.map(webPath => ({webPath}))},
    });
    const ids = (features: any[]) => features.map(f => f.properties.id);

    /** Simula una memoria localForage con le feature date, indicizzate per id. */
    const fakeStore = (instance: any, features: any[]) => {
      const items = new Map(features.map(f => [`${f.properties.id}`, f]));
      spyOn(instance, 'keys').and.callFake(() => Promise.resolve([...items.keys()]));
      spyOn(instance, 'getItem').and.callFake((k: string) => Promise.resolve(items.get(k) ?? null));
      spyOn(instance, 'removeItem').and.callFake((k: string) => {
        items.delete(k);
        return Promise.resolve();
      });
    };

    describe('_findUgcToRemove', () => {
      it('toglie le UGC il cui id il server non restituisce più', () => {
        const toRemove = (service as any)._findUgcToRemove(
          [track(133)],
          [track(133), track(134), track(135)],
        );
        expect(ids(toRemove)).toEqual([134, 135]);
      });

      it('non toglie nulla se il server restituisce tutte le UGC locali', () => {
        expect((service as any)._findUgcToRemove([track(1), track(2)], [track(1), track(2)])).toEqual([]);
      });

      it('confronta gli id come stringa', () => {
        expect((service as any)._findUgcToRemove([track(7)], [track('7')])).toEqual([]);
      });

      it('con elenco del server vuoto toglie tutte le sincronizzate', () => {
        expect(ids((service as any)._findUgcToRemove([], [track(1), track(2)]))).toEqual([1, 2]);
      });

      it('tiene due UGC del server con lo stesso uuid', () => {
        const server = [track(133, [], 'A'), track(134, [], 'A')];
        expect((service as any)._findUgcToRemove(server, server)).toEqual([]);
      });

      it('ignora le UGC locali senza id e le voci null', () => {
        expect((service as any)._findUgcToRemove([], [track(undefined), null])).toEqual([]);
      });
    });

    describe('_findImgUrlsToRemove', () => {
      it('cancella le immagini usate solo dalla UGC tolta', () => {
        const urls = (service as any)._findImgUrlsToRemove(
          [track(134, ['a.jpg', 'b.jpg'])],
          [track(133, ['a.jpg'])],
        );
        expect(urls).toEqual(['b.jpg']);
      });

      it("non cancella un'immagine usata da una UGC dell'altro tipo", () => {
        expect((service as any)._findImgUrlsToRemove([track(1, ['p.jpg'])], [poi(9, ['p.jpg'])])).toEqual([]);
      });

      it('restituisce ogni URL una sola volta', () => {
        const urls = (service as any)._findImgUrlsToRemove([track(1, ['x.jpg']), track(2, ['x.jpg'])], []);
        expect(urls).toEqual(['x.jpg']);
      });
    });

    describe('_fetchUgc*', () => {
      const cases = [
        {fetch: '_fetchUgcTracks', getApi: '_getApiTracks'},
        {fetch: '_fetchUgcPois', getApi: '_getApiPois'},
      ];
      const badResponses = [
        {label: 'il server restituisce null', value: null},
        {label: 'features non è un array', value: {type: 'FeatureCollection'}},
      ];
      cases.forEach(({fetch, getApi}) =>
        badResponses.forEach(({label, value}) =>
          it(`${fetch} non riconcilia se ${label}`, async () => {
            spyOn<any>(service, getApi).and.returnValue(Promise.resolve(value));
            const reconcile = spyOn<any>(service, '_reconcileUgc');
            await (service as any)[fetch]();
            expect(reconcile).not.toHaveBeenCalled();
          }),
        ),
      );
    });

    describe('_reconcileUgc', () => {
      it('toglie la copia, poi le sue immagini non più usate, e notifica gli id tolti', async () => {
        const local = [track(133, ['a.jpg']), track(134, ['a.jpg', 'b.jpg'])];
        fakeStore(synchronizedUgcTrack, local);
        fakeStore(synchronizedUgcPoi, []);
        const removeImg = spyOn(synchronizedImg, 'removeItem').and.returnValue(Promise.resolve());

        await (service as any)._reconcileUgc('track', [track(133, ['a.jpg'])], local);

        expect(synchronizedUgcTrack.removeItem).toHaveBeenCalledOnceWith('134');
        expect(synchronizedUgcTrack.removeItem).toHaveBeenCalledBefore(removeImg);
        expect(removeImg).toHaveBeenCalledOnceWith('b.jpg');
        expect(mockStore.dispatch).toHaveBeenCalledOnceWith(
          removedSynchronizedUgc({ugcType: 'track', ids: ['134']}),
        );
      });

      it('per i POI usa la memoria dei POI e protegge le immagini delle tracce', async () => {
        const local = [poi(1), poi(2, ['p.jpg'])];
        fakeStore(synchronizedUgcPoi, local);
        fakeStore(synchronizedUgcTrack, [track(9, ['p.jpg'])]);
        const removeImg = spyOn(synchronizedImg, 'removeItem').and.returnValue(Promise.resolve());

        await (service as any)._reconcileUgc('poi', [poi(1)], local);

        expect(synchronizedUgcPoi.removeItem).toHaveBeenCalledOnceWith('2');
        expect(removeImg).not.toHaveBeenCalled();
        expect(mockStore.dispatch).toHaveBeenCalledOnceWith(
          removedSynchronizedUgc({ugcType: 'poi', ids: ['2']}),
        );
      });

      it("senza UGC da togliere non legge l'altro tipo e non notifica nulla", async () => {
        const local = [track(133, ['a.jpg'])];
        fakeStore(synchronizedUgcPoi, []);

        await (service as any)._reconcileUgc('track', [track(133, ['a.jpg'])], local);

        expect(synchronizedUgcPoi.keys).not.toHaveBeenCalled();
        expect(mockStore.dispatch).not.toHaveBeenCalled();
      });

      it("non legge l'altro tipo se le UGC tolte non hanno immagini", async () => {
        const local = [track(133), track(134)];
        fakeStore(synchronizedUgcTrack, local);
        fakeStore(synchronizedUgcPoi, []);

        await (service as any)._reconcileUgc('track', [track(133)], local);

        expect(synchronizedUgcTrack.removeItem).toHaveBeenCalledOnceWith('134');
        expect(synchronizedUgcPoi.keys).not.toHaveBeenCalled();
      });

      it('se la rimozione fallisce non cancella le immagini e non notifica la UGC', async () => {
        const local = [track(133), track(134, ['b.jpg'])];
        spyOn(synchronizedUgcTrack, 'removeItem').and.returnValue(Promise.reject(new Error('quota')));
        fakeStore(synchronizedUgcPoi, []);
        const removeImg = spyOn(synchronizedImg, 'removeItem').and.returnValue(Promise.resolve());

        await (service as any)._reconcileUgc('track', [track(133)], local);

        expect(removeImg).not.toHaveBeenCalled();
        expect(mockStore.dispatch).not.toHaveBeenCalled();
      });

      it("se la lettura dell'altro tipo fallisce non cancella immagini, ma toglie la UGC", async () => {
        const local = [track(133), track(134, ['b.jpg'])];
        fakeStore(synchronizedUgcTrack, local);
        spyOn(synchronizedUgcPoi, 'keys').and.returnValue(Promise.reject(new Error('idb')));
        const removeImg = spyOn(synchronizedImg, 'removeItem').and.returnValue(Promise.resolve());

        await (service as any)._reconcileUgc('track', [track(133)], local);

        expect(synchronizedUgcTrack.removeItem).toHaveBeenCalledOnceWith('134');
        expect(removeImg).not.toHaveBeenCalled();
        expect(mockStore.dispatch).toHaveBeenCalledOnceWith(
          removedSynchronizedUgc({ugcType: 'track', ids: ['134']}),
        );
      });
    });
  });
});
