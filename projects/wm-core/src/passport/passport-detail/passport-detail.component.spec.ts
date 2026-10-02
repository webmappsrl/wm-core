import {firstValueFrom, of, Subject, throwError} from 'rxjs';
import {WmPassportDetailComponent} from './passport-detail.component';

describe('WmPassportDetailComponent (oc:8166)', () => {
  const partial = {totalStages: 12, completedStages: 0, percent: 0, completed: false, stages: []};
  const done = {totalStages: 6, completedStages: 6, percent: 100, completed: true, stages: []};
  const stage = (trackId: number, it: string) => ({trackId, name: {it}, status: 'not_started', distance: 0});

  function create(
    progress: any,
    certification: any,
    lang: any = {currentLang: 'it', onLangChange: new Subject<any>(), instant: (k: string, p?: any) => k.replace('{{date}}', p?.date ?? '')},
  ) {
    const resume$ = new Subject<void>();
    const svc = {
      progress$: jasmine.createSpy('progress$').and.returnValue(of(progress)),
      refreshProgress: jasmine.createSpy('refreshProgress'),
      getCertification: jasmine.createSpy('getCertification').and.returnValue(of(certification)),
      appResume$: () => resume$,
    } as any;
    const cmp = new WmPassportDetailComponent(svc, lang as any);
    cmp.layerId = 3;
    return {cmp, svc, resume$, lang};
  }

  it("all'apertura verifica lo stato della richiesta del layer", async () => {
    const {cmp, svc} = create(partial, {status: 'none'});

    await firstValueFrom(cmp.vm$);

    expect(svc.getCertification).toHaveBeenCalledWith(3);
    expect(svc.progress$).toHaveBeenCalledWith(3);
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
    const svc = {progress$: () => of(partial), getCertification: () => of({status: 'none'})} as any;
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

    it("approvata: esito approvato, niente rimando all'email: le tappe sono a schermo (oc:8676)", async () => {
      const vm = await firstValueFrom(
        create(partial, {status: 'approved', decisionNote: 'Timbri 2 e 5 leggibili'}).cmp.vm$,
      );

      expect(vm.outcome).toBe('approved');
      expect(vm.showEmailHint).toBeFalse();
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

  describe('tappe validate (oc:8676)', () => {
    it('prima lettura del progresso fallita: progress null, certificazione comunque presente', async () => {
      const vm = await firstValueFrom(create(null, {status: 'none'}).cmp.vm$);

      expect(vm.progress).toBeNull();
      expect(vm.stages).toEqual([]);
      expect(vm.certification.status).toBe('none');
      expect(vm.showCta).toBeFalse();
      expect(vm.showRetry).toBeFalse();
    });

    it('le tappe del vm sono ordinate per nome', async () => {
      const progress = {...partial, stages: [stage(1, 'Tappa 06'), stage(2, 'Tappa 01'), stage(3, 'Tappa 10')]};
      const vm = await firstValueFrom(create(progress, {status: 'none'}).cmp.vm$);

      expect(vm.stages.map(s => s.trackId)).toEqual([2, 1, 3]);
    });

    it('al cambio lingua le tappe si riordinano nella lingua nuova', () => {
      const progress = {
        ...partial,
        stages: [
          {...stage(1, 'B'), name: {it: 'B', en: 'A'}},
          {...stage(2, 'A'), name: {it: 'A', en: 'B'}},
        ],
      };
      const {cmp, lang} = create(progress, {status: 'none'});
      const seen: number[][] = [];
      const sub = cmp.vm$.subscribe(vm => seen.push(vm.stages.map(s => s.trackId)));
      lang.currentLang = 'en';
      lang.onLangChange.next({lang: 'en'});

      expect(seen).toEqual([[2, 1], [1, 2]]);
      sub.unsubscribe();
    });

    it('il completamento viene dal backend, non dalla percentuale', async () => {
      const completedLow = {...partial, percent: 99, completed: true};
      const notCompletedFull = {...partial, percent: 100, completed: false};

      expect((await firstValueFrom(create(completedLow, {status: 'approved'}).cmp.vm$)).showRetry).toBeFalse();
      expect((await firstValueFrom(create(notCompletedFull, {status: 'approved'}).cmp.vm$)).showRetry).toBeTrue();
    });

    it('refresh rilegge anche il progresso, per tutti quelli che lo mostrano', () => {
      const {cmp, svc} = create(partial, {status: 'none'});
      const sub = cmp.vm$.subscribe();

      cmp.refresh();

      expect(svc.refreshProgress).toHaveBeenCalledWith(3);
      expect(svc.getCertification).toHaveBeenCalledTimes(2);
      sub.unsubscribe();
    });

    it('stageLabel mostra il nome della tappa nella lingua corrente', () => {
      const {cmp} = create(partial, {status: 'none'});

      expect(cmp.stageLabel({...stage(1, 'Tappa 01'), name: {it: 'Tappa 01', en: 'Stage 01'}} as any)).toBe('Tappa 01');
    });
  });

  describe('richieste e accessibilità (oc:8676, review)', () => {
    it('refresh rilegge senza risottoscrivere lo stream condiviso del progresso', () => {
      const {cmp, svc} = create(partial, {status: 'none'});
      const sub = cmp.vm$.subscribe();

      cmp.refresh();
      cmp.refresh();

      expect(svc.progress$).toHaveBeenCalledTimes(1);
      expect(svc.refreshProgress).toHaveBeenCalledTimes(2);
      sub.unsubscribe();
    });

    it('al resume rilegge solo la certificazione: il progresso si rilegge già da sé', () => {
      const {cmp, svc, resume$} = create(partial, {status: 'pending'});
      const sub = cmp.vm$.subscribe();
      cmp.ngOnInit();

      resume$.next();

      expect(svc.getCertification).toHaveBeenCalledTimes(2);
      expect(svc.refreshProgress).not.toHaveBeenCalled();
      sub.unsubscribe();
      cmp.ngOnDestroy();
    });

    it('tornando da una tappa non rilegge nulla; tornando dal form sì', async () => {
      const {cmp, svc} = create(partial, {status: 'none'});
      cmp.host = {openForm: () => Promise.resolve(), openStage: () => Promise.resolve(), close: () => Promise.resolve()};
      const sub = cmp.vm$.subscribe();
      cmp.ionViewWillEnter();

      await cmp.openStage(stage(1, 'Tappa 01') as any);
      cmp.ionViewWillEnter();
      expect(svc.getCertification).toHaveBeenCalledTimes(1);

      cmp.ionViewWillEnter();
      expect(svc.getCertification).toHaveBeenCalledTimes(2);
      sub.unsubscribe();
    });

    it("l'etichetta accessibile della riga dice nome e stato", () => {
      const {cmp} = create(partial, {status: 'none'});
      const done = {...stage(1, 'Tappa 01'), status: 'completed', completedAt: '2026-09-30T14:45:55+00:00'};

      expect(cmp.rowAriaLabel(done as any)).toBe('Tappa 01, percorsa il 30 set');
      expect(cmp.rowAriaLabel(stage(2, 'Tappa 02') as any)).toBe('Tappa 02, non ancora percorsa');
    });

    it('trackStage identifica la riga con l\'id della tappa', () => {
      const {cmp} = create(partial, {status: 'none'});

      expect(cmp.trackStage(0, stage(7, 'X') as any)).toBe(7);
    });
  });
});
