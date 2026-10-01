import {BehaviorSubject, Subject, of, throwError} from 'rxjs';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {WmPassportFormComponent} from './passport-form.component';

describe('WmPassportFormComponent (oc:8166)', () => {
  let svc: {submitCertification: jasmine.Spy};
  let host: {registerGuard: jasmine.Spy; back: jasmine.Spy; backToDetail: jasmine.Spy};
  let alertCtrl: {create: jasmine.Spy};
  let toastCtrl: {create: jasmine.Spy};
  let needsPrivacy$: BehaviorSubject<boolean>;
  let logged$: BehaviorSubject<boolean>;
  let alertRole: 'confirm' | 'cancel';

  const photo = (n: number) => ({webPath: `blob:${n}`}) as any;

  function create(): WmPassportFormComponent {
    const store = {
      select: (sel: unknown) => (sel === needsPrivacyAgree ? needsPrivacy$ : sel === isLogged ? logged$ : of(null)),
    } as any;
    const cmp = new WmPassportFormComponent(
      svc as any,
      store,
      alertCtrl as any,
      toastCtrl as any,
      {instant: (k: string) => k} as any,
      {markForCheck() {}} as any,
    );
    cmp.layerId = 3;
    cmp.host = host as any;
    spyOn(cmp as any, '_toBlob').and.resolveTo(new Blob());
    cmp.ngOnInit();
    return cmp;
  }

  function fill(cmp: WmPassportFormComponent, photos = 1): void {
    cmp.onPhotos(Array.from({length: photos}, (_, i) => photo(i)));
    cmp.form.controls.disclaimer.setValue(true);
  }

  beforeEach(() => {
    svc = {submitCertification: jasmine.createSpy('submitCertification').and.returnValue(of({status: 'pending'}))};
    host = {
      registerGuard: jasmine.createSpy('registerGuard'),
      back: jasmine.createSpy('back').and.resolveTo(),
      backToDetail: jasmine.createSpy('backToDetail').and.resolveTo(),
    };
    alertRole = 'confirm';
    alertCtrl = {
      create: jasmine.createSpy('create').and.callFake(async () => ({
        present: async () => {},
        onDidDismiss: async () => ({role: alertRole}),
      })),
    };
    toastCtrl = {create: jasmine.createSpy('create').and.resolveTo({present: async () => {}})};
    needsPrivacy$ = new BehaviorSubject(false);
    logged$ = new BehaviorSubject(true);
  });

  it('senza foto o senza disclaimer non si può inviare', () => {
    const cmp = create();
    expect(cmp.canSubmit).toBeFalse();

    cmp.onPhotos([photo(1)]);
    expect(cmp.canSubmit).toBeFalse();

    cmp.form.controls.disclaimer.setValue(true);
    expect(cmp.canSubmit).toBeTrue();
  });

  it('oltre il massimo di 6 foto non si può inviare', () => {
    const cmp = create();

    fill(cmp, 7);

    expect(cmp.canSubmit).toBeFalse();
  });

  it('un tentativo di invio non valido mostra gli errori e non chiama il service', async () => {
    const cmp = create();

    await cmp.submit();

    expect(cmp.triedSubmit).toBeTrue();
    expect(svc.submitCertification).not.toHaveBeenCalled();
  });

  it('il numero seriale è opzionale e viene inviato solo se presente', async () => {
    const cmp = create();
    fill(cmp);
    cmp.form.controls.serialNumber.setValue('  CG-2026-00341  ');

    await cmp.submit();

    const req = svc.submitCertification.calls.mostRecent().args[0];
    expect(req).toEqual(jasmine.objectContaining({layerId: 3, serialNumber: 'CG-2026-00341', disclaimerAccepted: true}));
    expect(req.photos.length).toBe(1);
  });

  it('senza numero seriale la richiesta non ha il campo serialNumber', async () => {
    const cmp = create();
    fill(cmp);

    await cmp.submit();

    expect('serialNumber' in svc.submitCertification.calls.mostRecent().args[0]).toBeFalse();
  });

  it('invio riuscito: toast di conferma e ritorno al dettaglio', async () => {
    const cmp = create();
    fill(cmp);

    await cmp.submit();

    expect(toastCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({message: 'Richiesta inviata'}));
    expect(host.backToDetail).toHaveBeenCalled();
    expect(cmp.photos.length).toBe(0);
  });

  it('consenso privacy mancante: invio bloccato', async () => {
    needsPrivacy$.next(true);
    const cmp = create();
    fill(cmp);

    expect(cmp.canSubmit).toBeFalse();
    await cmp.submit();

    expect(svc.submitCertification).not.toHaveBeenCalled();
  });

  it('utente sloggato durante la compilazione: invio bloccato', async () => {
    const cmp = create();
    fill(cmp);

    logged$.next(false);
    await cmp.submit();

    expect(svc.submitCertification).not.toHaveBeenCalled();
  });

  it("errore d'invio: messaggio d'errore, foto conservate, pulsante di nuovo attivo", async () => {
    svc.submitCertification.and.returnValue(throwError(() => new Error('x')));
    const cmp = create();
    fill(cmp, 2);

    await cmp.submit();

    expect(toastCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({message: 'Invio non riuscito, riprova'}));
    expect(cmp.photos.length).toBe(2);
    expect(cmp.submitting).toBeFalse();
    expect(host.backToDetail).not.toHaveBeenCalled();
  });

  it('nessun invio doppio mentre il primo è in corso', async () => {
    const pending$ = new Subject<any>();
    svc.submitCertification.and.returnValue(pending$);
    const cmp = create();
    fill(cmp);

    const first = cmp.submit();
    await Promise.resolve();
    await cmp.submit();
    pending$.next({status: 'pending'});
    pending$.complete();
    await first;

    expect(svc.submitCertification).toHaveBeenCalledTimes(1);
  });

  it('uscita con foto non inviate: chiede conferma e rispetta la scelta', async () => {
    const cmp = create();
    cmp.onPhotos([photo(1)]);

    alertRole = 'cancel';
    expect(await cmp.canLeave()).toBeFalse();

    alertRole = 'confirm';
    expect(await cmp.canLeave()).toBeTrue();
  });

  it('uscita senza foto: nessuna conferma', async () => {
    const cmp = create();

    expect(await cmp.canLeave()).toBeTrue();
    expect(alertCtrl.create).not.toHaveBeenCalled();
  });

  it("si registra come guard sull'host e si toglie alla distruzione", () => {
    const cmp = create();
    expect(host.registerGuard).toHaveBeenCalledWith(cmp);

    cmp.ngOnDestroy();

    expect(host.registerGuard).toHaveBeenCalledWith(null);
  });
});
