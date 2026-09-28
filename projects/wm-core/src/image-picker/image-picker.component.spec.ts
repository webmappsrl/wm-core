import {WmImagePickerComponent} from './image-picker.component';

describe('WmImagePickerComponent — limite foto (oc:8166)', () => {
  let cmp: WmImagePickerComponent;
  let cameraSvc: jasmine.SpyObj<any>;

  const photo = (n: number) => ({webPath: `blob:${n}`}) as any;
  const localCount = () => (cmp as any)._localPhotos$.value.length;

  beforeEach(() => {
    cameraSvc = jasmine.createSpyObj('CameraService', ['getPhotos', 'getPhotoData', 'shotPhoto']);
    // ogni foto ha dati diversi, così la deduplica md5 non interferisce
    cameraSvc.getPhotoData.and.callFake(async (p: string) => p);
    cmp = new WmImagePickerComponent(
      cameraSvc,
      {markForCheck() {}} as any,
      {dispatch() {}} as any,
      {isBrowser: true, isMobile: false} as any,
    );
    cmp.maxPhotos = 6;
  });

  afterEach(() => cmp.ngOnDestroy());

  it('con 4 posti liberi e 10 foto scelte insieme ne aggiunge esattamente 4', async () => {
    (cmp as any)._localPhotos$.next([photo(100), photo(101)]);
    cameraSvc.getPhotos.and.resolveTo(Array.from({length: 10}, (_, i) => photo(i)));

    await cmp.addPhotosFromLibrary();

    expect(localCount()).toBe(6);
  });

  it('passa a pickImages un limit pari ai posti rimasti', async () => {
    (cmp as any)._localPhotos$.next([photo(100)]);
    cameraSvc.getPhotos.and.resolveTo([]);

    await cmp.addPhotosFromLibrary();

    expect(cameraSvc.getPhotos.calls.mostRecent().args[1].limit).toBe(5);
  });

  it('con il picker pieno non apre la galleria', async () => {
    (cmp as any)._localPhotos$.next(Array.from({length: 6}, (_, i) => photo(i)));

    await cmp.addPhotosFromLibrary();

    expect(cameraSvc.getPhotos).not.toHaveBeenCalled();
  });

  it('takePhoto non aggiunge oltre il massimo', async () => {
    (cmp as any)._localPhotos$.next(Array.from({length: 6}, (_, i) => photo(i)));
    cameraSvc.shotPhoto.and.resolveTo(photo(99));

    await cmp.takePhoto();

    expect(cameraSvc.shotPhoto).not.toHaveBeenCalled();
    expect(localCount()).toBe(6);
  });

  it('con captureOptions passa larghezza, qualità e GPS a fotocamera e galleria', async () => {
    cmp.captureOptions = {maxWidth: 1600, quality: 80, startNavigation: false};
    cameraSvc.shotPhoto.and.resolveTo(photo(1));
    cameraSvc.getPhotos.and.resolveTo([]);

    await cmp.takePhoto();
    await cmp.addPhotosFromLibrary();

    expect(cameraSvc.shotPhoto).toHaveBeenCalledWith(1600, {quality: 80, startNavigation: false});
    expect(cameraSvc.getPhotos.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({width: 1600, quality: 80}),
    );
  });

  it('senza captureOptions chiama shotPhoto come prima', async () => {
    cameraSvc.shotPhoto.and.resolveTo(photo(1));

    await cmp.takePhoto();

    expect(cameraSvc.shotPhoto).toHaveBeenCalledWith(undefined, {});
    expect(localCount()).toBe(1);
  });

  it('una foto già presente non viene aggiunta due volte', async () => {
    (cmp as any)._localPhotos$.next([photo(1)]);
    cameraSvc.getPhotos.and.resolveTo([photo(1), photo(2)]);

    await cmp.addPhotosFromLibrary();

    expect(localCount()).toBe(2);
  });

  it('i posti liberi contano anche le foto già sincronizzate', async () => {
    cmp.maxPhotos = 5;
    cmp.synchronizedPhotos = [{id: 1}, {id: 2}, {id: 3}] as any;
    cameraSvc.getPhotos.and.resolveTo(Array.from({length: 5}, (_, i) => photo(i)));

    await cmp.addPhotosFromLibrary();

    expect(cameraSvc.getPhotos.calls.mostRecent().args[1].limit).toBe(2);
    expect(localCount()).toBe(2);
  });

  it("se l'utente annulla la galleria emette comunque endAddPhotos", async () => {
    const ended = jasmine.createSpy('ended');
    cmp.endAddPhotos.subscribe(ended);
    cameraSvc.getPhotos.and.rejectWith(new Error('User cancelled photos app'));

    await cmp.addPhotosFromLibrary();

    expect(ended).toHaveBeenCalled();
  });
});
