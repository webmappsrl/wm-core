import {BehaviorSubject} from 'rxjs';
import {openLoginModal} from '@wm-core/store/user-activity/user-activity.action';
import {Diary} from './diary.model';
import {DIARY_BACK_PRIORITY, DiaryLauncherService} from './diary-launcher.service';
import {WmDiaryFormComponent} from './diary-form/diary-form.component';
import {WmDiaryDetailComponent} from './diary-detail/diary-detail.component';

describe('DiaryLauncherService (oc:8169)', () => {
  const diary: Diary = {
    id: 4,
    uuid: 'u4',
    layer: {id: 7, name: 'Cammino'},
    ecTrack: {id: 70, name: 'Tappa 05'},
    description: 'x',
    createdAt: '',
    updatedAt: '',
    photos: [],
    ugcTrackIds: [],
    publicationConsent: false,
  };

  let logged$: BehaviorSubject<boolean>;
  let store: {select: jasmine.Spy; dispatch: jasmine.Spy};
  let modal: {present: jasmine.Spy; dismiss: jasmine.Spy; onDidDismiss: jasmine.Spy};
  let modalCtrl: {create: jasmine.Spy};
  let topAlert: {dismiss: jasmine.Spy} | undefined;
  let backHandler: (() => Promise<void>) | null;
  let backSub: {unsubscribe: jasmine.Spy};
  let resolveDismiss: () => void;
  let svc: DiaryLauncherService;

  /** Opzioni passate a `ModalController.create`. */
  const modalOpts = (): any => modalCtrl.create.calls.mostRecent().args[0];

  beforeEach(() => {
    logged$ = new BehaviorSubject(true);
    store = {select: jasmine.createSpy('select').and.returnValue(logged$), dispatch: jasmine.createSpy('dispatch')};
    modal = {
      present: jasmine.createSpy('present').and.resolveTo(),
      // come Ionic: dismiss() passa da canDismiss
      dismiss: jasmine.createSpy('dismiss').and.callFake(async () => {
        const ok = await modalOpts().canDismiss();
        if (ok) resolveDismiss();
        return ok;
      }),
      onDidDismiss: jasmine
        .createSpy('onDidDismiss')
        .and.returnValue(new Promise<void>(r => (resolveDismiss = r))),
    };
    modalCtrl = {create: jasmine.createSpy('create').and.resolveTo(modal)};
    topAlert = undefined;
    backHandler = null;
    backSub = {unsubscribe: jasmine.createSpy('unsubscribe')};
    const platform = {
      backButton: {
        subscribeWithPriority: jasmine.createSpy('subscribeWithPriority').and.callFake((_p: number, fn: any) => {
          backHandler = fn;
          return backSub;
        }),
      },
    };
    const alertCtrl = {getTop: async () => topAlert};
    svc = new DiaryLauncherService(store as any, modalCtrl as any, alertCtrl as any, platform as any);
  });

  /** Host passato al componente nella modale. */
  const modalHost = (): any => modalOpts().componentProps.host;

  it('da non loggato apre il login e basta', async () => {
    logged$.next(false);
    const nav = jasmine.createSpyObj('IonNav', ['push']);
    await svc.openForm({layerId: 7, contextLabel: 'x', nav});
    expect(store.dispatch).toHaveBeenCalledWith(openLoginModal());
    expect(nav.push).not.toHaveBeenCalled();
    expect(modalCtrl.create).not.toHaveBeenCalled();
  });

  it('con nav spinge il form e registra il guard sul contenitore', async () => {
    const nav = jasmine.createSpyObj('IonNav', ['push', 'pop']);
    nav.push.and.resolveTo(true);
    const guardHost = jasmine.createSpyObj('guardHost', ['registerGuard']);
    await svc.openForm({layerId: 7, ecTrackId: 70, contextLabel: 'ctx', nav, guardHost});
    const [component, params] = nav.push.calls.mostRecent().args;
    expect(component).toBe(WmDiaryFormComponent);
    expect(params).toEqual(jasmine.objectContaining({layerId: 7, ecTrackId: 70, contextLabel: 'ctx'}));
    const guard = {canLeave: async () => true};
    params.host.registerGuard(guard);
    expect(guardHost.registerGuard).toHaveBeenCalledWith(guard);
    params.host.back();
    expect(nav.pop).toHaveBeenCalled();
    expect(modalCtrl.create).not.toHaveBeenCalled();
  });

  it('senza nav apre il form in una modale con il back hardware sopra 100', async () => {
    await svc.openForm({layerId: 7, contextLabel: 'ctx'});
    expect(modalOpts().component).toBe(WmDiaryFormComponent);
    expect(modal.present).toHaveBeenCalled();
    expect((svc as any)._platform.backButton.subscribeWithPriority.calls.mostRecent().args[0]).toBe(
      DIARY_BACK_PRIORITY,
    );
    expect(DIARY_BACK_PRIORITY).toBeGreaterThan(100);
  });

  it('swipe o backdrop: canDismiss chiede canLeave al form', async () => {
    await svc.openForm({layerId: 7, contextLabel: 'ctx'});
    const guard = {canLeave: jasmine.createSpy('canLeave').and.resolveTo(false)};
    modalHost().registerGuard(guard);
    expect(await modalOpts().canDismiss()).toBeFalse();
    guard.canLeave.and.resolveTo(true);
    expect(await modalOpts().canDismiss()).toBeTrue();
  });

  it('back() del form chiude senza chiedere di nuovo', async () => {
    await svc.openForm({layerId: 7, contextLabel: 'ctx'});
    const guard = {canLeave: jasmine.createSpy('canLeave').and.resolveTo(false)};
    modalHost().registerGuard(guard);
    modalHost().back();
    await new Promise(r => setTimeout(r));
    expect(guard.canLeave).not.toHaveBeenCalled();
    expect(modal.dismiss).toHaveBeenCalled();
  });

  it('back hardware: chiude prima l\'alert aperto, poi passa da canLeave', async () => {
    await svc.openForm({layerId: 7, contextLabel: 'ctx'});
    const guard = {canLeave: jasmine.createSpy('canLeave').and.resolveTo(false)};
    modalHost().registerGuard(guard);
    topAlert = {dismiss: jasmine.createSpy('dismiss').and.resolveTo(true)};
    await backHandler!();
    expect(topAlert.dismiss).toHaveBeenCalled();
    expect(modal.dismiss).not.toHaveBeenCalled();

    topAlert = undefined;
    await backHandler!();
    expect(guard.canLeave).toHaveBeenCalled();
    expect(modal.dismiss).toHaveBeenCalled();
  });

  it('il gestore del back si toglie alla chiusura della modale', async () => {
    await svc.openForm({layerId: 7, contextLabel: 'ctx'});
    modalHost().back();
    await new Promise(r => setTimeout(r));
    expect(backSub.unsubscribe).toHaveBeenCalled();
  });

  it('doppio tap: una sola apertura', async () => {
    await Promise.all([svc.openForm({contextLabel: 'a'}), svc.openForm({contextLabel: 'b'})]);
    expect(modalCtrl.create).toHaveBeenCalledTimes(1);
  });

  it('openDetail con nav spinge il dettaglio; «Modifica» spinge il form nello stesso nav', async () => {
    const nav = jasmine.createSpyObj('IonNav', ['push', 'pop']);
    nav.push.and.resolveTo(true);
    await svc.openDetail(diary, nav);
    const [component, params] = nav.push.calls.mostRecent().args;
    expect(component).toBe(WmDiaryDetailComponent);
    expect(params.diary).toBe(diary);
    params.host.edit(diary);
    await new Promise(r => setTimeout(r));
    const [formComponent, formParams] = nav.push.calls.mostRecent().args;
    expect(formComponent).toBe(WmDiaryFormComponent);
    expect(formParams.diary).toBe(diary);
    expect(formParams.contextLabel).toBe('Tappa 05 · Cammino');
  });

  it('openDetail in modale: exit() chiude passando da canDismiss già approvato', async () => {
    await svc.openDetail(diary);
    expect(await modalHost().exit()).toBeTrue();
    expect(modal.dismiss).toHaveBeenCalled();
    expect(await modalOpts().canDismiss()).toBeTrue();
  });

  it('openDetail con nav: exit() chiude tutta la modale del Passaporto', async () => {
    const nav = jasmine.createSpyObj('IonNav', ['push', 'pop']);
    nav.push.and.resolveTo(true);
    const guardHost = {
      registerGuard: jasmine.createSpy('registerGuard'),
      close: jasmine.createSpy('close').and.resolveTo(true),
    };
    await svc.openDetail(diary, nav, guardHost);
    const [, params] = nav.push.calls.mostRecent().args;
    expect(await params.host.exit()).toBeTrue();
    expect(guardHost.close).toHaveBeenCalled();
    expect(nav.pop).not.toHaveBeenCalled();
  });

  it('openDetail con nav: exit() restituisce false se la modale del Passaporto non si chiude', async () => {
    const nav = jasmine.createSpyObj('IonNav', ['push', 'pop']);
    nav.push.and.resolveTo(true);
    const guardHost = {
      registerGuard: jasmine.createSpy('registerGuard'),
      close: jasmine.createSpy('close').and.resolveTo(false),
    };
    await svc.openDetail(diary, nav, guardHost);
    const [, params] = nav.push.calls.mostRecent().args;
    expect(await params.host.exit()).toBeFalse();
  });

  it('openDetail con nav senza close() sul contenitore: exit() toglie almeno il dettaglio', async () => {
    const nav = jasmine.createSpyObj('IonNav', ['push', 'pop']);
    nav.push.and.resolveTo(true);
    nav.pop.and.resolveTo(true);
    await svc.openDetail(diary, nav);
    const [, params] = nav.push.calls.mostRecent().args;
    expect(await params.host.exit()).toBeTrue();
    expect(nav.pop).toHaveBeenCalled();
  });

  it('openDetail senza nav apre una modale', async () => {
    await svc.openDetail(diary);
    expect(modalOpts().component).toBe(WmDiaryDetailComponent);
    expect(modalOpts().componentProps.diary).toBe(diary);
  });

  it('due back ravvicinati: una sola richiesta di conferma', async () => {
    await svc.openForm({layerId: 7, contextLabel: 'ctx'});
    let answer: (ok: boolean) => void = () => {};
    const guard = {
      canLeave: jasmine.createSpy('canLeave').and.callFake(() => new Promise<boolean>(r => (answer = r))),
    };
    modalHost().registerGuard(guard);
    const first = backHandler!();
    await new Promise(r => setTimeout(r));
    const second = backHandler!();
    await new Promise(r => setTimeout(r));
    // anche swipe/backdrop nel frattempo condividono la stessa conferma
    const third = modalOpts().canDismiss();
    answer(false);
    await Promise.all([first, second, third]);
    expect(guard.canLeave).toHaveBeenCalledTimes(1);
  });

  it('present() fallito: nessun gestore del back resta iscritto', async () => {
    modal.present.and.rejectWith(new Error('x'));
    await expectAsync(svc.openForm({layerId: 7, contextLabel: 'ctx'})).toBeRejected();
    expect(backHandler).toBeNull();
  });
});
