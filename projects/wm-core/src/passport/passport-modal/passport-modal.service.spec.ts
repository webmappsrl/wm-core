import {PassportModalService} from './passport-modal.service';
import {WmPassportModalComponent} from './passport-modal.component';

describe('PassportModalService (oc:8703)', () => {
  let modalCtrl: jasmine.SpyObj<any>;
  let present: jasmine.Spy;
  let refreshProgress: jasmine.Spy;
  let reloadProgress: jasmine.Spy;
  let dismissed: () => void;
  let svc: PassportModalService;

  const params = {
    layerId: 4,
    layerTitle: 'Via degli Dei',
    layerLogo: 'logo.png',
    layerImage: 'img.jpg',
  };

  beforeEach(() => {
    present = jasmine.createSpy('present').and.resolveTo();
    refreshProgress = jasmine.createSpy('refreshProgress');
    reloadProgress = jasmine.createSpy('reloadProgress');
    modalCtrl = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrl.create.and.callFake(async () => ({
      present,
      onDidDismiss: () => new Promise<void>(r => (dismissed = r)),
    }));
    svc = new PassportModalService(modalCtrl, {refreshProgress, reloadProgress} as any);
  });

  it('crea la modale del dettaglio con i parametri e senza chiusura dal backdrop', async () => {
    await svc.open(params);

    expect(modalCtrl.create).toHaveBeenCalledOnceWith({
      component: WmPassportModalComponent,
      componentProps: params,
      backdropDismiss: false,
    });
    expect(present).toHaveBeenCalled();
  });

  it('alla chiusura rilegge il progresso del layer', async () => {
    await svc.open(params);
    expect(refreshProgress).not.toHaveBeenCalled();

    dismissed();
    await Promise.resolve();

    expect(refreshProgress).toHaveBeenCalledOnceWith(4);
  });

  it('con refresh rilegge il progresso prima di mostrare la modale', async () => {
    present.and.callFake(async () => expect(reloadProgress).toHaveBeenCalledOnceWith(4));

    await svc.open(params, {refresh: true});

    expect(present).toHaveBeenCalled();
    // all'apertura si rilegge solo il progresso del layer, non anche /api/passport
    expect(refreshProgress).not.toHaveBeenCalled();
  });

  it('due aperture di fila creano una sola modale', async () => {
    await Promise.all([svc.open(params), svc.open(params)]);

    expect(modalCtrl.create).toHaveBeenCalledTimes(1);
  });

  it('chiusa la modale, si può riaprire', async () => {
    await svc.open(params);
    dismissed();
    await Promise.resolve();
    await svc.open(params);

    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
  });
});
