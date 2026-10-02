import {Subject} from 'rxjs';
import {WmPassportModalComponent} from './passport-modal.component';
import {WmPassportFormComponent} from '../passport-form/passport-form.component';
import {WmPassportDetailComponent} from '../passport-detail/passport-detail.component';
import {WmPassportStageDetailComponent} from '../passport-stage-detail/passport-stage-detail.component';

describe('WmPassportModalComponent (oc:8166)', () => {
  let modalCtrl: jasmine.SpyObj<any>;
  let backHandler: () => void;
  let nav: jasmine.SpyObj<any>;
  let cmp: WmPassportModalComponent;
  let alertCtrl: jasmine.SpyObj<any>;

  beforeEach(() => {
    modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrl.dismiss.and.resolveTo(true);
    const platform = {
      backButton: {
        subscribeWithPriority: (_priority: number, handler: () => void) => {
          backHandler = handler;
          return new Subject().subscribe();
        },
      },
    } as any;
    nav = jasmine.createSpyObj('IonNav', ['canGoBack', 'pop', 'popToRoot', 'push', 'setRoot']);
    nav.setRoot.and.resolveTo(true);
    nav.pop.and.resolveTo(true);
    nav.popToRoot.and.resolveTo(true);
    alertCtrl = jasmine.createSpyObj('AlertController', ['getTop']);
    alertCtrl.getTop.and.resolveTo(undefined);
    cmp = new WmPassportModalComponent(modalCtrl, platform, alertCtrl);
    cmp.nav = nav;
    cmp.layerId = 55;
    cmp.layerTitle = 'Cammino';
    cmp.ngAfterViewInit();
  });

  afterEach(() => cmp.ngOnDestroy());

  it('il back hardware dal form torna al dettaglio senza chiudere la modale', async () => {
    nav.canGoBack.and.resolveTo(true);

    await cmp.back();

    expect(nav.pop).toHaveBeenCalled();
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();
  });

  it('il gestore del back hardware registrato chiama back()', () => {
    spyOn(cmp, 'back').and.resolveTo();

    backHandler();

    expect(cmp.back).toHaveBeenCalled();
  });

  it('il back dal dettaglio chiude la modale', async () => {
    nav.canGoBack.and.resolveTo(false);

    await cmp.back();

    expect(modalCtrl.dismiss).toHaveBeenCalled();
  });

  it('se il form rifiuta l\'uscita non torna indietro e non chiude', async () => {
    nav.canGoBack.and.resolveTo(true);
    cmp.registerGuard({canLeave: async () => false});

    await cmp.back();
    await cmp.close();

    expect(nav.pop).not.toHaveBeenCalled();
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();
  });

  it('senza guard registrato close() chiude', async () => {
    cmp.registerGuard(null);

    await cmp.close();

    expect(modalCtrl.dismiss).toHaveBeenCalled();
  });

  it('backToDetail torna alla radice senza chiedere al guard', async () => {
    const canLeave = jasmine.createSpy('canLeave').and.resolveTo(false);
    cmp.registerGuard({canLeave});

    await cmp.backToDetail();

    expect(nav.popToRoot).toHaveBeenCalled();
    expect(canLeave).not.toHaveBeenCalled();
  });

  it('i parametri della radice portano layer e host', () => {
    cmp.layerId = 7;
    cmp.layerTitle = 'Cammino';
    cmp.layerLogo = 'logo.png';
    cmp.layerImage = 'foto.jpg';

    expect(cmp.rootParams).toEqual({
      layerId: 7,
      layerTitle: 'Cammino',
      layerLogo: 'logo.png',
      layerImage: 'foto.jpg',
      host: cmp,
    });
  });

  it('openForm spinge il form con layer e host', async () => {
    cmp.layerId = 7;
    nav.push.and.resolveTo(true);

    await cmp.openForm();

    expect(nav.push).toHaveBeenCalledWith(WmPassportFormComponent, {layerId: 7, host: cmp});
  });

  it('openStage spinge la pagina della tappa con tappa, titolo e host (oc:8676)', async () => {
    const stage = {trackId: 203, name: {it: 'Tappa 06'}, status: 'completed', distance: 19.5} as any;
    nav.push.and.resolveTo(true);

    await cmp.openStage(stage);

    expect(nav.push).toHaveBeenCalledWith(WmPassportStageDetailComponent, {
      stage,
      layerTitle: 'Cammino',
      host: cmp,
    });
  });

  it('un doppio tap su una tappa spinge una sola pagina (oc:8676)', async () => {
    let resolve: (v: boolean) => void;
    nav.push.and.returnValue(new Promise<boolean>(r => (resolve = r)));
    const stage = {trackId: 1, name: {}, status: 'not_started', distance: 0} as any;

    const first = cmp.openStage(stage);
    await cmp.openStage(stage);
    resolve(true);
    await first;

    expect(nav.push).toHaveBeenCalledTimes(1);
  });

  it('imposta la radice con i parametri in un solo passo, non via binding (race di ion-nav)', () => {
    expect(nav.setRoot).toHaveBeenCalledWith(
      WmPassportDetailComponent,
      jasmine.objectContaining({layerId: 55, layerTitle: 'Cammino', host: cmp}),
    );
  });

  it('back con un alert aperto chiude solo l\'alert (priorità 101 sopra gli overlay)', async () => {
    const alert = jasmine.createSpyObj('HTMLIonAlertElement', ['dismiss']);
    alertCtrl.getTop.and.resolveTo(alert);
    const canLeave = jasmine.createSpy('canLeave').and.resolveTo(true);
    cmp.registerGuard({canLeave});

    await cmp.back();

    expect(alert.dismiss).toHaveBeenCalled();
    expect(canLeave).not.toHaveBeenCalled();
    expect(nav.pop).not.toHaveBeenCalled();
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();
  });

  it('un doppio tap sulla CTA apre un solo form', async () => {
    let finish: (v: boolean) => void;
    nav.push.and.returnValue(new Promise<boolean>(r => (finish = r)));

    const first = cmp.openForm();
    await cmp.openForm();
    finish(true);
    await first;

    expect(nav.push).toHaveBeenCalledTimes(1);
  });

  it('con il form già aperto la CTA non ne apre un altro', async () => {
    nav.push.and.resolveTo(true);
    await cmp.openForm();
    cmp.registerGuard({canLeave: async () => true});

    await cmp.openForm();

    expect(nav.push).toHaveBeenCalledTimes(1);
  });
});
