import {firstValueFrom, of} from 'rxjs';
import {WmPassportDetailComponent} from './passport-detail.component';

describe('WmPassportDetailComponent (oc:8166)', () => {
  const partial = {totalStages: 12, completedStages: 0, percent: 0, stages: []};
  const done = {totalStages: 6, completedStages: 6, percent: 100, stages: []};

  function create(progress: any, certification: any) {
    const svc = {
      getProgress: jasmine.createSpy('getProgress').and.returnValue(of(progress)),
      getCertification: jasmine.createSpy('getCertification').and.returnValue(of(certification)),
    } as any;
    const cmp = new WmPassportDetailComponent(svc, {currentLang: 'it'} as any);
    cmp.layerId = 3;
    return {cmp, svc};
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
});
