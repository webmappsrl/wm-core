import {HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject, Subject, of, throwError} from 'rxjs';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import {formatDateForLang} from '../passport.utils';
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
    cmp.form.controls.startDate.setValue('2026-09-01');
    cmp.form.controls.endDate.setValue('2026-09-05');
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
    cmp.form.controls.startDate.setValue('2026-09-01');
    cmp.form.controls.endDate.setValue('2026-09-05');
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

  describe('date di percorrenza (oc:8761)', () => {
    it('senza date non si può inviare e compare la nota', async () => {
      const cmp = create();
      fill(cmp);
      cmp.form.controls.startDate.setValue(null);
      cmp.form.controls.endDate.setValue(null);

      expect(cmp.canSubmit).toBeFalse();
      await cmp.submit();

      expect(cmp.triedSubmit).toBeTrue();
      expect(cmp.datesValid).toBeFalse();
      expect(svc.submitCertification).not.toHaveBeenCalled();
    });

    it("una fine prima dell'inizio non è valida", () => {
      const cmp = create();
      fill(cmp);
      cmp.form.controls.startDate.setValue('2026-09-05');
      cmp.form.controls.endDate.setValue('2026-09-01');

      expect(cmp.datesValid).toBeFalse();
      expect(cmp.canSubmit).toBeFalse();
    });

    it('inizio uguale alla fine è valido', () => {
      const cmp = create();
      fill(cmp);
      cmp.form.controls.startDate.setValue('2026-09-03');
      cmp.form.controls.endDate.setValue('2026-09-03');

      expect(cmp.datesValid).toBeTrue();
      expect(cmp.canSubmit).toBeTrue();
    });

    it('confermare un inizio oltre la fine svuota la fine', () => {
      const cmp = create();
      fill(cmp);

      cmp.openCalendar('start');
      cmp.onDatePicked('2026-09-10T00:00:00');
      cmp.confirmDate();

      expect(cmp.form.controls.startDate.value).toBe('2026-09-10');
      expect(cmp.form.controls.endDate.value).toBeNull();
      expect(cmp.datesValid).toBeFalse();
    });

    it('toccare un giorno non imposta il campo finché non si conferma', () => {
      const cmp = create();
      fill(cmp);

      cmp.openCalendar('end');
      expect(cmp.pendingDate).toBe('2026-09-05');
      cmp.onDatePicked('2026-09-07T10:30:00');

      expect(cmp.pendingDate).toBe('2026-09-07');
      expect(cmp.form.controls.endDate.value).toBe('2026-09-05');
    });

    it('calendarValue resta stabile durante la chiusura del foglio', () => {
      const cmp = create();
      fill(cmp);

      cmp.openCalendar('end');
      cmp.closeCalendar();
      expect(cmp.calendarValue).toBe('2026-09-05');

      cmp.form.controls.endDate.setValue(null);
      expect(cmp.calendarValue).toBe(cmp.today);
    });

    it('confirmDate imposta la data e chiude il calendario', () => {
      const cmp = create();
      fill(cmp);

      cmp.openCalendar('end');
      expect(cmp.editing).toBe('end');
      cmp.onDatePicked(['2026-09-07T10:30:00']);
      cmp.confirmDate();

      expect(cmp.form.controls.endDate.value).toBe('2026-09-07');
      expect(cmp.form.controls.startDate.value).toBe('2026-09-01');
      expect(cmp.editing).toBeNull();
      expect(cmp.pendingDate).toBeNull();
    });

    it("chiudere il calendario senza confermare lascia il campo com'era", () => {
      const cmp = create();

      cmp.openCalendar('start');
      expect(cmp.pendingDate).toBe(cmp.today);
      cmp.onDatePicked('2026-09-03');
      cmp.onDatePicked(null);
      expect(cmp.pendingDate).toBe('2026-09-03');
      cmp.closeCalendar();

      expect(cmp.form.controls.startDate.value).toBeNull();
      expect(cmp.editing).toBeNull();
      expect(cmp.pendingDate).toBeNull();
    });

    it('dopo un tentativo di invio segnala in errore il campo vuoto o la fine non valida', async () => {
      const cmp = create();
      expect(cmp.startDateInvalid).toBeFalse();
      expect(cmp.endDateInvalid).toBeFalse();

      cmp.form.controls.startDate.setValue('2026-09-05');
      await cmp.submit();
      expect(cmp.startDateInvalid).toBeFalse();
      expect(cmp.endDateInvalid).toBeTrue();

      cmp.form.controls.endDate.setValue('2026-09-01');
      expect(cmp.endDateInvalid).toBeTrue();

      cmp.form.controls.endDate.setValue('2026-09-05');
      expect(cmp.endDateInvalid).toBeFalse();
    });

    it("l'invio porta startDate ed endDate", async () => {
      const cmp = create();
      fill(cmp);

      await cmp.submit();

      expect(svc.submitCertification.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({startDate: '2026-09-01', endDate: '2026-09-05'}),
      );
    });

    it('closeOverlay chiude il calendario aperto', async () => {
      const cmp = create();
      fill(cmp);
      cmp.openCalendar('start');
      cmp.onDatePicked('2026-08-20');

      expect(await cmp.closeOverlay()).toBeTrue();
      expect(cmp.editing).toBeNull();
      expect(cmp.form.controls.startDate.value).toBe('2026-09-01');
    });

    it('closeOverlay senza calendario risolve false', async () => {
      const cmp = create();

      expect(await cmp.closeOverlay()).toBeFalse();
    });

    it('422 sulle date: messaggio sulle date', async () => {
      svc.submitCertification.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 422, error: {errors: {start_date: ['x']}}})),
      );
      const cmp = create();
      fill(cmp);

      await cmp.submit();

      expect(toastCtrl.create).toHaveBeenCalledWith(
        jasmine.objectContaining({message: 'Controlla le date di percorrenza e riprova'}),
      );
    });

    it('422 solo sulle foto: messaggio generico', async () => {
      svc.submitCertification.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 422, error: {errors: {'images.0': ['x']}}})),
      );
      const cmp = create();
      fill(cmp);

      await cmp.submit();

      expect(toastCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({message: 'Invio non riuscito, riprova'}));
    });

    it('422 con errors stringa: messaggio generico', async () => {
      svc.submitCertification.and.returnValue(
        throwError(() => new HttpErrorResponse({status: 422, error: {errors: 'start_date'}})),
      );
      const cmp = create();
      fill(cmp);

      await cmp.submit();

      expect(toastCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({message: 'Invio non riuscito, riprova'}));
    });

    it('riaprire un campo durante la chiusura non viene annullato dal didDismiss precedente', () => {
      const cmp = create();
      cmp.form.controls.startDate.setValue('2026-09-01');

      cmp.openCalendar('start');
      cmp.confirmDate();
      cmp.openCalendar('end');
      cmp.onCalendarDismissed();

      expect(cmp.editing).toBe('end');
      expect(cmp.pendingDate).not.toBeNull();
    });

    it('didDismiss dopo trascinamento o sfondo azzera lo stato', () => {
      const cmp = create();

      cmp.openCalendar('start');
      cmp.onCalendarDismissed();

      expect(cmp.editing).toBeNull();
      expect(cmp.pendingDate).toBeNull();
    });

    it('uscita con sole date: chiede conferma', async () => {
      const cmp = create();
      cmp.form.controls.startDate.setValue('2026-09-01');

      alertRole = 'cancel';
      expect(await cmp.canLeave()).toBeFalse();
      expect(alertCtrl.create).toHaveBeenCalledWith(
        jasmine.objectContaining({message: 'Hai dati non inviati. Vuoi uscire e perderli?'}),
      );
    });

    it('etichetta del bottone: «Seleziona la data» se vuota, altrimenti la data formattata', () => {
      const cmp = create();

      expect(cmp.dateLabel(null)).toBe('Seleziona la data');
      expect(cmp.dateLabel('2026-09-01')).not.toBe('Seleziona la data');
      // Il mock di LangService non ha `currentLang`: vale la lingua di default.
      expect(cmp.dateLabel('2026-09-01')).toBe(formatDateForLang('2026-09-01', undefined));
    });
  });
});
