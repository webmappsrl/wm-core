import {BehaviorSubject, firstValueFrom, of} from 'rxjs';
import {PassportService} from './passport.service';
import {passportRingDegrees, toLayerId} from './passport.utils';
import {PASSPORT_MOCK_STORAGE_KEY} from './passport.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';

describe('PassportService (mock, oc:8166)', () => {
  let svc: PassportService;
  const counts = {'3': {tracks: 12}, '4': {tracks: 30}, '5': {tracks: 6}, '9': {tracks: 0}};
  const request = (layerId: number) => ({layerId, photos: [new Blob()], disclaimerAccepted: true as const});

  function create(logged = true): PassportService {
    const store = {select: (sel: unknown) => (sel === isLogged ? of(logged) : of(counts))} as any;
    return new PassportService(store);
  }

  beforeEach(() => {
    localStorage.removeItem(PASSPORT_MOCK_STORAGE_KEY);
    svc = create();
  });

  afterEach(() => localStorage.removeItem(PASSPORT_MOCK_STORAGE_KEY));

  it('il progresso è deterministico e copre 0%, parziale e 100%', async () => {
    const p3 = await firstValueFrom(svc.getProgress(3));
    const p4 = await firstValueFrom(svc.getProgress(4));
    const p5 = await firstValueFrom(svc.getProgress(5));

    expect(p3.percent).toBe(0);
    expect(p4.percent).toBeGreaterThan(0);
    expect(p4.percent).toBeLessThan(100);
    expect(p5.percent).toBe(100);
    expect(p4.totalStages).toBe(30);
    expect(p4.stages.length).toBe(30);
    expect(await firstValueFrom(svc.getProgress(4))).toEqual(p4);
  });

  it('nel progresso parziale ci sono tappe percorse, una in corso e le altre non percorse', async () => {
    const p = await firstValueFrom(svc.getProgress(4));
    const statuses = p.stages.map(s => s.status);

    expect(statuses.filter(s => s === 'completed').length).toBe(p.completedStages);
    expect(statuses.filter(s => s === 'in_progress').length).toBe(1);
    expect(statuses[statuses.length - 1]).toBe('not_started');
  });

  it('un layer senza track ha totalStages 0 e nessuna tappa', async () => {
    const p = await firstValueFrom(svc.getProgress(9));

    expect(p.totalStages).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.stages).toEqual([]);
  });

  it('senza invii lo stato della richiesta è none', async () => {
    const c = await firstValueFrom(svc.getCertification(3));

    expect(c.status).toBe('none');
    expect(c.submittedAt).toBeUndefined();
  });

  it("dopo l'invio lo stato è pending, anche per una nuova istanza (reload)", async () => {
    await firstValueFrom(svc.submitCertification(request(3)));

    const c = await firstValueFrom(create().getCertification(3));

    expect(c.status).toBe('pending');
    expect(c.submittedAt).toBeTruthy();
    expect((await firstValueFrom(create().getCertification(4))).status).toBe('none');
  });

  it("simulateSubmitError fa fallire l'invio senza salvare nulla", async () => {
    svc.simulateSubmitError = true;

    await expectAsync(firstValueFrom(svc.submitCertification(request(3)))).toBeRejected();

    expect((await firstValueFrom(svc.getCertification(3))).status).toBe('none');
  });

  it('resetMock cancella le richieste salvate', async () => {
    await firstValueFrom(svc.submitCertification(request(3)));

    svc.resetMock();

    expect((await firstValueFrom(svc.getCertification(3))).status).toBe('none');
  });

  it('un valore corrotto in localStorage viene trattato come nessuna richiesta', async () => {
    localStorage.setItem(PASSPORT_MOCK_STORAGE_KEY, '{non json');

    expect((await firstValueFrom(svc.getCertification(3))).status).toBe('none');
  });

  it('se il conteggio delle track arriva dopo, il progresso si aggiorna', done => {
    const counts$ = new BehaviorSubject<any>({'3': {tracks: 0}});
    const late = new PassportService({select: () => counts$} as any);
    const totals: number[] = [];
    const sub = late.getProgress(3).subscribe(p => {
      totals.push(p.totalStages);
      if (totals.length === 1) counts$.next({'3': {tracks: 12}});
      if (totals.length === 2) {
        expect(totals).toEqual([0, 12]);
        sub.unsubscribe();
        done();
      }
    });
  });

  it('visibleProgress: loggato e con tappe restituisce il progresso', async () => {
    const p = await firstValueFrom(create(true).visibleProgress(4));

    expect(p?.totalStages).toBe(30);
  });

  it('visibleProgress: non loggato o senza tappe restituisce null', async () => {
    expect(await firstValueFrom(create(false).visibleProgress(4))).toBeNull();
    expect(await firstValueFrom(create(true).visibleProgress(9))).toBeNull();
  });

  it('passportRingDegrees e toLayerId: unica regola per anello, badge e dettaglio', () => {
    expect(passportRingDegrees(62)).toBeCloseTo(223.2);
    expect(passportRingDegrees(150)).toBe(360);
    expect(passportRingDegrees(undefined)).toBe(0);
    expect(toLayerId('55')).toBe(55);
    expect(toLayerId('')).toBeNull();
    expect(toLayerId(null)).toBeNull();
  });
});
