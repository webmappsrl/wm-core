import {CameraWeb} from '@capacitor/camera/dist/esm/web';
import {CameraService} from './camera.service';

describe('CameraService.shotPhoto — opzioni (oc:8166)', () => {
  let svc: CameraService;
  let geoSpy: {active: boolean; startNavigation: jasmine.Spy};
  let getPhotoSpy: jasmine.Spy;

  beforeEach(() => {
    geoSpy = {active: false, startNavigation: jasmine.createSpy('startNavigation').and.resolveTo()};
    svc = new CameraService(
      {isBrowser: true} as any,
      {} as any,
      geoSpy as any,
      {instant: (k: string) => k} as any,
      {} as any,
    );
    // `Camera` è un Proxy di Capacitor: la spia va sull'implementazione web a cui delega
    getPhotoSpy = spyOn(CameraWeb.prototype, 'getPhoto').and.resolveTo({webPath: null} as any);
  });

  it('senza opzioni avvia il GPS e usa quality 90, come oggi', async () => {
    await svc.shotPhoto();
    const args = getPhotoSpy.calls.mostRecent().args[0];
    expect(geoSpy.startNavigation).toHaveBeenCalled();
    expect(args.quality).toBe(90);
    expect(args.saveToGallery).toBe(true);
  });

  it('con startNavigation false non avvia il GPS e applica quality e width', async () => {
    await svc.shotPhoto(1600, {quality: 80, startNavigation: false});
    const args = getPhotoSpy.calls.mostRecent().args[0];
    expect(geoSpy.startNavigation).not.toHaveBeenCalled();
    expect(args.quality).toBe(80);
    expect(args.width).toBe(1600);
    expect(args.saveToGallery).toBe(true);
  });
});
