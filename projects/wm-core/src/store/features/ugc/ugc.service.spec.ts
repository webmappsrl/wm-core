import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {Store} from '@ngrx/store';
import {of} from 'rxjs';

import {UgcService} from './ugc.service';
import {EnvironmentService} from '@wm-core/services/environment.service';
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
  const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
  const environmentSpy = jasmine.createSpyObj('EnvironmentService', [], {
    origin: 'https://test-api.com'
  });

  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [
      UgcService,
      {provide: Store, useValue: storeSpy},
      {provide: EnvironmentService, useValue: environmentSpy}
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
});
