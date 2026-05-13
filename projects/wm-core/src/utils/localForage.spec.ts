import {
  synchronizedUgcPoi,
  synchronizedUgcTrack,
  deviceUgcPoi,
  deviceUgcTrack,
  synchronizedImg,
  deviceImg,
  removeSynchronizedImgsInsideProperties,
  removeUgcPoi,
  removeUgcTrack,
  saveUgcPoi,
  saveUgcTrack,
  isBlobUrl,
  isValidUrl,
} from './localForage';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';

const makePoi = (overrides: any = {}): WmFeature<Point> => ({
  type: 'Feature',
  geometry: {type: 'Point', coordinates: [11, 45]},
  properties: {name: 'Test POI', ...overrides},
});

const makeTrack = (overrides: any = {}): WmFeature<LineString> => ({
  type: 'Feature',
  geometry: {type: 'LineString', coordinates: [[11, 45], [12, 46]]},
  properties: {name: 'Test Track', ...overrides},
});

describe('localForage utilities', () => {
  beforeEach(() => {
    spyOn(synchronizedUgcPoi, 'removeItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedUgcPoi, 'setItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedUgcPoi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedUgcTrack, 'removeItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedUgcTrack, 'setItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedUgcTrack, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceUgcPoi, 'removeItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceUgcPoi, 'setItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceUgcPoi, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceUgcTrack, 'removeItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceUgcTrack, 'setItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceUgcTrack, 'getItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedImg, 'removeItem').and.returnValue(Promise.resolve(null));
    spyOn(synchronizedImg, 'setItem').and.returnValue(Promise.resolve(null));
    spyOn(deviceImg, 'setItem').and.returnValue(Promise.resolve(null));
  });

  describe('isBlobUrl', () => {
    it('should return true for blob URLs', () => {
      expect(isBlobUrl('blob:http://localhost/some-id')).toBeTrue();
    });

    it('should return false for regular URLs', () => {
      expect(isBlobUrl('https://example.com/image.jpg')).toBeFalse();
    });

    it('should return false for empty string', () => {
      expect(isBlobUrl('')).toBeFalse();
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com/image.jpg')).toBeTrue();
    });

    it('should return false for invalid strings', () => {
      expect(isValidUrl('not-a-url')).toBeFalse();
    });
  });

  describe('removeSynchronizedImgsInsideProperties', () => {
    it('should return early for null properties', async () => {
      await removeSynchronizedImgsInsideProperties(null);
      expect(synchronizedImg.removeItem).not.toHaveBeenCalled();
    });

    it('should return early for undefined properties', async () => {
      await removeSynchronizedImgsInsideProperties(undefined);
      expect(synchronizedImg.removeItem).not.toHaveBeenCalled();
    });

    it('should return early when no image URLs found in properties', async () => {
      await removeSynchronizedImgsInsideProperties({name: 'Test', description: 'No images'});
      expect(synchronizedImg.removeItem).not.toHaveBeenCalled();
    });

    it('should remove a single image URL found in properties', async () => {
      const properties = {image: 'https://example.com/photo.jpg', name: 'Test'};
      await removeSynchronizedImgsInsideProperties(properties);
      expect(synchronizedImg.removeItem).toHaveBeenCalledWith('https://example.com/photo.jpg');
    });

    it('should remove multiple image URLs from nested properties', async () => {
      const properties = {
        image: 'https://example.com/photo.jpg',
        gallery: {thumb: 'https://example.com/thumb.png'},
      };
      await removeSynchronizedImgsInsideProperties(properties);
      expect(synchronizedImg.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeUgcPoi', () => {
    it('should return early for null poi', async () => {
      await removeUgcPoi(null as any);
      expect(synchronizedUgcPoi.removeItem).not.toHaveBeenCalled();
      expect(deviceUgcPoi.removeItem).not.toHaveBeenCalled();
    });

    it('should use synchronizedUgcPoi storage when poi has an id', async () => {
      const poi = makePoi({id: 42});
      await removeUgcPoi(poi);
      expect(synchronizedUgcPoi.removeItem).toHaveBeenCalledWith('42');
      expect(deviceUgcPoi.removeItem).not.toHaveBeenCalled();
    });

    it('should remove synchronized images when poi has id (new behavior)', async () => {
      const poi = makePoi({id: 42, image: 'https://example.com/photo.jpg'});
      await removeUgcPoi(poi);
      expect(synchronizedImg.removeItem).toHaveBeenCalledWith('https://example.com/photo.jpg');
    });

    it('should NOT remove synchronized images for device poi (no id)', async () => {
      const poi = makePoi({uuid: 'abc-123', image: 'https://example.com/photo.jpg'});
      await removeUgcPoi(poi);
      expect(synchronizedImg.removeItem).not.toHaveBeenCalled();
    });

    it('should use deviceUgcPoi storage when poi has only uuid', async () => {
      const poi = makePoi({uuid: 'device-uuid'});
      await removeUgcPoi(poi);
      expect(deviceUgcPoi.removeItem).toHaveBeenCalledWith('device-uuid');
      expect(synchronizedUgcPoi.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('removeUgcTrack', () => {
    it('should return early for null track', async () => {
      await removeUgcTrack(null as any);
      expect(synchronizedUgcTrack.removeItem).not.toHaveBeenCalled();
      expect(deviceUgcTrack.removeItem).not.toHaveBeenCalled();
    });

    it('should use synchronizedUgcTrack storage when track has an id', async () => {
      const track = makeTrack({id: 10});
      await removeUgcTrack(track);
      expect(synchronizedUgcTrack.removeItem).toHaveBeenCalledWith('10');
      expect(deviceUgcTrack.removeItem).not.toHaveBeenCalled();
    });

    it('should remove synchronized images when track has id (new behavior)', async () => {
      const track = makeTrack({id: 10, image: 'https://example.com/cover.jpg'});
      await removeUgcTrack(track);
      expect(synchronizedImg.removeItem).toHaveBeenCalledWith('https://example.com/cover.jpg');
    });

    it('should NOT remove synchronized images for device track (no id)', async () => {
      const track = makeTrack({uuid: 'track-uuid', image: 'https://example.com/cover.jpg'});
      await removeUgcTrack(track);
      expect(synchronizedImg.removeItem).not.toHaveBeenCalled();
    });

    it('should use deviceUgcTrack when track has only uuid', async () => {
      const track = makeTrack({uuid: 'dev-uuid'});
      await removeUgcTrack(track);
      expect(deviceUgcTrack.removeItem).toHaveBeenCalledWith('dev-uuid');
      expect(synchronizedUgcTrack.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('saveUgcPoi', () => {
    it('should save to synchronizedUgcPoi when poi has id', async () => {
      const poi = makePoi({id: 5});
      await saveUgcPoi(poi);
      expect(synchronizedUgcPoi.setItem).toHaveBeenCalledWith('5', poi);
      expect(deviceUgcPoi.setItem).not.toHaveBeenCalled();
    });

    it('should save to deviceUgcPoi when poi has only uuid', async () => {
      const poi = makePoi({uuid: 'local-uuid'});
      await saveUgcPoi(poi);
      expect(deviceUgcPoi.setItem).toHaveBeenCalledWith('local-uuid', poi);
      expect(synchronizedUgcPoi.setItem).not.toHaveBeenCalled();
    });

    it('should not save images when media is empty', async () => {
      const poi = makePoi({uuid: 'local-uuid', media: []});
      await saveUgcPoi(poi);
      expect(deviceImg.setItem).not.toHaveBeenCalled();
      expect(synchronizedImg.setItem).not.toHaveBeenCalled();
    });

    it('should not save images when media has no webPath', async () => {
      const poi = makePoi({uuid: 'local-uuid', media: [{format: 'jpeg', saved: false}]});
      await saveUgcPoi(poi);
      expect(deviceImg.setItem).not.toHaveBeenCalled();
    });

    it('should return early for null feature without throwing', async () => {
      await expectAsync(saveUgcPoi(null as any)).toBeResolved();
      expect(synchronizedUgcPoi.setItem).not.toHaveBeenCalled();
      expect(deviceUgcPoi.setItem).not.toHaveBeenCalled();
    });
  });

  describe('saveUgcTrack', () => {
    it('should save to synchronizedUgcTrack when track has id', async () => {
      const track = makeTrack({id: 7});
      await saveUgcTrack(track);
      expect(synchronizedUgcTrack.setItem).toHaveBeenCalledWith('7', track);
      expect(deviceUgcTrack.setItem).not.toHaveBeenCalled();
    });

    it('should save to deviceUgcTrack when track has only uuid', async () => {
      const track = makeTrack({uuid: 'track-local'});
      await saveUgcTrack(track);
      expect(deviceUgcTrack.setItem).toHaveBeenCalledWith('track-local', track);
      expect(synchronizedUgcTrack.setItem).not.toHaveBeenCalled();
    });

    it('should not save images when media is empty', async () => {
      const track = makeTrack({uuid: 'local-track', media: []});
      await saveUgcTrack(track);
      expect(deviceImg.setItem).not.toHaveBeenCalled();
      expect(synchronizedImg.setItem).not.toHaveBeenCalled();
    });
  });
});
