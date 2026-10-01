import {firstValueFrom, of, Subject, throwError} from 'rxjs';
import {WmPassportDetailComponent} from './passport-detail.component';

describe('WmPassportDetailComponent (oc:8166)', () => {
  const partial = {totalStages: 12, completedStages: 0, percent: 0, stages: []};
  const done = {totalStages: 6, completedStages: 6, percent: 100, stages: []};

  function create(progress: any, certification: any) {
    const resume$ = new Subject<void>();
    const svc = {
      getProgress: jasmine.createSpy('getProgress').and.returnValue(of(progress)),
      getCertification: jasmine.createSpy('getCertification').and.returnValue(of(certification)),
      appResume$: () => resume$,
    } as any;
    const cmp = new WmPassportDetailComponent(svc, {currentLang: 'it'} as any);
    cmp.layerId = 3;
    return {cmp, svc, resume$};
  }

  it("all'apertura verifica lo stato della richiesta del layer", async () => {
    const {cmp, svc} = create(partial, {status: 'none'});

    await firstValueFrom(cmp.vm$);

    expect(svc.getCertification).toHaveBeenCalledWith(3);
    expect(svc.getProgress).toHaveBeenCalledWith(3);
  });

  it('nessuna richiesta e cammino non completato: mostra la CTA', async () => {
    const vm = await firstValueFrom(create(partial, {status: 'none'}).cmp.vm$);

    expect(vm.showCta).toBeTrue();
  });

  it('richiesta in attesa: niente CTA', async () => {
    const vm = await firstValueFrom(
      create(partial, {status: 'pending', submittedAt: '2026-09-28'}).cmp.vm$,
    );

    expect(vm.showCta).toBeFalse();
    expect(vm.certification.status).toBe('pending');
  });

  it('cammino completato: niente CTA', async () => {
    const vm = await firstValueFrom(create(done, {status: 'none'}).cmp.vm$);

    expect(vm.showCta).toBeFalse();
  });

  it('tornando in primo piano rilegge lo stato della richiesta', async () => {
    const {cmp, svc} = create(partial, {status: 'none'});
    await firstValueFrom(cmp.vm$);

    cmp.ionViewWillEnter();
    cmp.ionViewWillEnter();
    await firstValueFrom(cmp.vm$);

    expect(svc.getCertification).toHaveBeenCalledTimes(2);
  });

  it('tornando in primo piano la nuova verifica arriva sullo stesso vm$ (OnPush)', async () => {
    const {cmp, svc} = create(partial, {status: 'none'});
    const seen: string[] = [];
    const sub = cmp.vm$.subscribe(vm => seen.push(vm.certification.status));
    svc.getCertification.and.returnValue(of({status: 'pending', submittedAt: '2026-09-28'}));

    cmp.ionViewWillEnter();
    cmp.ionViewWillEnter();

    expect(seen).toEqual(['none', 'pending']);
    sub.unsubscribe();
  });

  it("l'anello di avanzamento converte la percentuale in gradi", () => {
    const {cmp} = create(partial, {status: 'none'});

    expect(cmp.ringDegrees(0)).toBe(0);
    expect(cmp.ringDegrees(64)).toBeCloseTo(230.4);
    expect(cmp.ringDegrees(100)).toBe(360);
  });

  it('la data breve è nella lingua corrente, come nel wireframe («12 mag»)', () => {
    const {cmp} = create(partial, {status: 'none'});

    expect(cmp.shortDate('2026-05-12')).toBe('12 mag');
    expect(cmp.shortDate(undefined)).toBe('');
  });

  it('la lingua «pr» del repo si formatta come portoghese', () => {
    const svc = {getProgress: () => of(partial), getCertification: () => of({status: 'none'})} as any;
    const cmp = new WmPassportDetailComponent(svc, {currentLang: 'pr'} as any);

    expect(cmp.shortDate('2026-05-12')).toBe(new Intl.DateTimeFormat('pt', {day: 'numeric', month: 'short'}).format(new Date('2026-05-12')));
  });

  it('la prima entrata non ricarica: i dati arrivano già con la sottoscrizione', async () => {
    const {cmp, svc} = create(partial, {status: 'none'});
    const sub = cmp.vm$.subscribe();

    cmp.ionViewWillEnter();

    expect(svc.getCertification).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
  });

  describe('esito della richiesta (oc:8671)', () => {
    it('approvata e cammino non completo: bottone di nuovo invio, niente CTA', async () => {
      const vm = await firstValueFrom(create(partial, {status: 'approved'}).cmp.vm$);

      expect(vm.showRetry).toBeTrue();
      expect(vm.showCta).toBeFalse();
    });

    it('approvata e cammino completo: niente bottone', async () => {
      const vm = await firstValueFrom(create(done, {status: 'approved'}).cmp.vm$);

      expect(vm.showRetry).toBeFalse();
    });

    it('non accettata: bottone di nuovo invio anche a cammino completo', async () => {
      const vm = await firstValueFrom(create(done, {status: 'rejected'}).cmp.vm$);

      expect(vm.showRetry).toBeTrue();
      expect(vm.showCta).toBeFalse();
    });

    it("approvata: esito approvato e rimando all'email anche con la nota", async () => {
      const vm = await firstValueFrom(
        create(partial, {status: 'approved', decisionNote: 'Timbri 2 e 5 leggibili'}).cmp.vm$,
      );

      expect(vm.outcome).toBe('approved');
      expect(vm.showEmailHint).toBeTrue();
    });

    it("non accettata con nota: niente rimando all'email, la nota basta", async () => {
      const vm = await firstValueFrom(
        create(partial, {status: 'rejected', decisionNote: 'Foto illeggibile'}).cmp.vm$,
      );

      expect(vm.outcome).toBe('rejected');
      expect(vm.showEmailHint).toBeFalse();
    });

    it("non accettata senza nota: rimando all'email", async () => {
      const vm = await firstValueFrom(create(partial, {status: 'rejected'}).cmp.vm$);

      expect(vm.showEmailHint).toBeTrue();
    });

    it('in revisione o senza richiesta: nessun esito', async () => {
      expect((await firstValueFrom(create(partial, {status: 'pending'}).cmp.vm$)).outcome).toBeNull();
      expect((await firstValueFrom(create(partial, {status: 'none'}).cmp.vm$)).outcome).toBeNull();
    });

    it('in revisione: né CTA né bottone', async () => {
      const vm = await firstValueFrom(create(partial, {status: 'pending'}).cmp.vm$);

      expect(vm.showCta).toBeFalse();
      expect(vm.showRetry).toBeFalse();
    });

    it('prima lettura fallita: vm con certification null, né CTA né bottone', async () => {
      const {cmp, svc} = create(partial, {status: 'none'});
      svc.getCertification.and.returnValue(throwError(() => new Error('rete')));

      const vm = await firstValueFrom(cmp.vm$);

      expect(vm.certification).toBeNull();
      expect(vm.showCta).toBeFalse();
      expect(vm.showRetry).toBeFalse();
    });

    it("rilettura fallita: resta l'ultimo stato noto e la successiva riprova", () => {
      const {cmp, svc} = create(partial, {status: 'approved'});
      const seen: (string | null)[] = [];
      let completed = false;
      const sub = cmp.vm$.subscribe({
        next: vm => seen.push(vm.certification?.status ?? null),
        complete: () => (completed = true),
      });

      svc.getCertification.and.returnValue(throwError(() => new Error('rete')));
      cmp.refresh();
      svc.getCertification.and.returnValue(of({status: 'rejected'}));
      cmp.refresh();

      expect(seen).toEqual(['approved', 'approved', 'rejected']);
      expect(completed).toBeFalse();
      sub.unsubscribe();
    });

    it("al resume dell'app rilegge lo stato", () => {
      const {cmp, svc, resume$} = create(partial, {status: 'pending'});
      const sub = cmp.vm$.subscribe();
      cmp.ngOnInit();

      resume$.next();

      expect(svc.getCertification).toHaveBeenCalledTimes(2);
      sub.unsubscribe();
      cmp.ngOnDestroy();
    });

    it('alla chiusura smette di ascoltare il resume', () => {
      const {cmp, resume$} = create(partial, {status: 'pending'});
      cmp.ngOnInit();

      cmp.ngOnDestroy();

      expect(resume$.observed).toBeFalse();
    });
  });
});
