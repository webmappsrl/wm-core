import {HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject, firstValueFrom, of, throwError} from 'rxjs';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {PassportService} from './passport.service';
import {passportRingDegrees, toLayerId} from './passport.utils';

describe('PassportService (oc:8166)', () => {
  const ORIGIN = 'http://127.0.0.1:8000';
  const counts = {'3': {tracks: 12}, '4': {tracks: 30}, '5': {tracks: 6}, '9': {tracks: 0}};
  let http: {get: jasmine.Spy; post: jasmine.Spy};

  function create(logged = true, currentLang: string | undefined = 'it'): PassportService {
    const store = {select: (sel: unknown) => (sel === isLogged ? of(logged) : of(counts))} as any;
    return new PassportService(store, http as any, {origin: ORIGIN} as any, {currentLang} as any);
  }

  const request = (serialNumber?: string) => ({
    layerId: 3,
    photos: [new Blob(['a'], {type: 'image/jpeg'}), new Blob(['b'], {type: 'image/png'})],
    ...(serialNumber ? {serialNumber} : {}),
    disclaimerAccepted: true as const,
  });

  beforeEach(() => {
    http = {get: jasmine.createSpy('get'), post: jasmine.createSpy('post')};
  });

  describe('progresso (ancora mock: il backend non ha la rotta)', () => {
    it('è deterministico e copre 0%, parziale e 100%', async () => {
      const svc = create();
      const p3 = await firstValueFrom(svc.getProgress(3));
      const p4 = await firstValueFrom(svc.getProgress(4));
      const p5 = await firstValueFrom(svc.getProgress(5));

      expect(p3.percent).toBe(0);
      expect(p4.percent).toBeGreaterThan(0);
      expect(p4.percent).toBeLessThan(100);
      expect(p5.percent).toBe(100);
      expect(p4.stages.length).toBe(30);
    });

    it('nel parziale ci sono tappe percorse, una in corso e le altre non percorse', async () => {
      const p = await firstValueFrom(create().getProgress(4));
      const statuses = p.stages.map(s => s.status);

      expect(statuses.filter(s => s === 'completed').length).toBe(p.completedStages);
      expect(statuses.filter(s => s === 'in_progress').length).toBe(1);
      expect(statuses[statuses.length - 1]).toBe('not_started');
    });

    it('un layer senza track ha totalStages 0 e nessuna tappa', async () => {
      const p = await firstValueFrom(create().getProgress(9));

      expect(p.totalStages).toBe(0);
      expect(p.stages).toEqual([]);
    });

    it('se il conteggio delle track arriva dopo, il progresso si aggiorna', done => {
      const counts$ = new BehaviorSubject<any>({'3': {tracks: 0}});
      const late = new PassportService({select: () => counts$} as any, http as any, {origin: ORIGIN} as any, {} as any);
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
  });

  describe('visibleProgress', () => {
    it('loggato e con tappe restituisce il progresso', async () => {
      expect((await firstValueFrom(create(true).visibleProgress(4)))?.totalStages).toBe(30);
    });

    it('non loggato, senza id o senza tappe restituisce null', async () => {
      expect(await firstValueFrom(create(false).visibleProgress(4))).toBeNull();
      expect(await firstValueFrom(create(true).visibleProgress(null))).toBeNull();
      expect(await firstValueFrom(create(true).visibleProgress(9))).toBeNull();
    });
  });

  describe('stato della richiesta: GET /api/layer/{id}/certification', () => {
    it('chiama la rotta del layer e mappa none', async () => {
      http.get.and.returnValue(of({status: 'none'}));

      const c = await firstValueFrom(create().getCertification(3));

      expect(http.get).toHaveBeenCalledWith(`${ORIGIN}/api/layer/3/certification`);
      expect(c).toEqual({layerId: 3, status: 'none'});
    });

    it('mappa pending con submitted_at in submittedAt', async () => {
      http.get.and.returnValue(of({status: 'pending', submitted_at: '2026-09-29T10:00:00+02:00'}));

      const c = await firstValueFrom(create().getCertification(3));

      expect(c).toEqual({layerId: 3, status: 'pending', submittedAt: '2026-09-29T10:00:00+02:00'});
    });

    it('approvata con nota: stato, date e nota (oc:8671)', async () => {
      http.get.and.returnValue(
        of({
          status: 'approved',
          submitted_at: '2026-09-30T11:14:00+00:00',
          decided_at: '2026-09-30T11:29:00+00:00',
          decision_note: 'Timbri 2 e 5 leggibili',
        }),
      );

      const c = await firstValueFrom(create().getCertification(3));

      expect(c).toEqual({
        layerId: 3,
        status: 'approved',
        submittedAt: '2026-09-30T11:14:00+00:00',
        decidedAt: '2026-09-30T11:29:00+00:00',
        decisionNote: 'Timbri 2 e 5 leggibili',
      });
    });

    it('rifiutata senza nota: decisionNote assente (oc:8671)', async () => {
      http.get.and.returnValue(
        of({
          status: 'rejected',
          submitted_at: '2026-09-30T11:14:00+00:00',
          decided_at: '2026-09-30T11:29:00+00:00',
          decision_note: null,
        }),
      );

      const c = await firstValueFrom(create().getCertification(3));

      expect(c.status).toBe('rejected');
      expect(c.decidedAt).toBe('2026-09-30T11:29:00+00:00');
      expect(c.decisionNote).toBeUndefined();
    });

    it('nota vuota o di soli spazi vale come assente (oc:8671)', async () => {
      http.get.and.returnValue(of({status: 'rejected', decided_at: '2026-09-30T11:29:00+00:00', decision_note: '   '}));

      expect((await firstValueFrom(create().getCertification(3))).decisionNote).toBeUndefined();
    });

    it('uno stato sconosciuto diventa none', async () => {
      http.get.and.returnValue(of({status: 'cancelled', submitted_at: '2026-09-29T10:00:00+02:00'}));

      expect(await firstValueFrom(create().getCertification(3))).toEqual({layerId: 3, status: 'none'});
    });
  });

  describe('invio: POST /api/layer/{id}/certification', () => {
    it('manda il multipart con images[], serial_number e disclaimer_accepted', async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-29T10:00:00+02:00'}));

      const c = await firstValueFrom(create().submitCertification(request('CG-2026-00341')));

      const [url, body] = http.post.calls.mostRecent().args;
      const form = body as FormData;
      expect(url).toBe(`${ORIGIN}/api/layer/3/certification`);
      const images = form.getAll('images[]') as File[];
      expect(images.length).toBe(2);
      expect(images[0].name).toBe('credenziale_1.jpg');
      expect(images[1].name).toBe('credenziale_2.png');
      expect(form.get('serial_number')).toBe('CG-2026-00341');
      expect(form.get('disclaimer_accepted')).toBe('1');
      expect(c).toEqual({layerId: 3, status: 'pending', submittedAt: '2026-09-29T10:00:00+02:00'});
    });

    it('senza numero seriale non manda serial_number', async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-29T10:00:00+02:00'}));

      await firstValueFrom(create().submitCertification(request()));

      expect((http.post.calls.mostRecent().args[1] as FormData).has('serial_number')).toBeFalse();
    });

    it('409 (richiesta già in attesa) rilegge lo stato e lo restituisce, senza errore', async () => {
      http.post.and.returnValue(throwError(() => new HttpErrorResponse({status: 409})));
      http.get.and.returnValue(of({status: 'pending', submitted_at: '2026-09-28T09:00:00+02:00'}));

      const c = await firstValueFrom(create().submitCertification(request()));

      expect(c).toEqual({layerId: 3, status: 'pending', submittedAt: '2026-09-28T09:00:00+02:00'});
    });

    it('gli altri errori (422, 413, rete) arrivano al form', async () => {
      http.post.and.returnValue(throwError(() => new HttpErrorResponse({status: 422})));

      await expectAsync(firstValueFrom(create().submitCertification(request()))).toBeRejected();
    });

    it("il POST manda Accept-Language con la lingua scelta nell'app (oc:8671)", async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-30T11:14:00+00:00'}));

      await firstValueFrom(create(true, 'en').submitCertification(request()));

      const options = http.post.calls.mostRecent().args[2];
      expect(options.headers.get('Accept-Language')).toBe('en');
    });

    it('senza lingua impostata il POST non manda Accept-Language (oc:8671)', async () => {
      http.post.and.returnValue(of({status: 'pending', submitted_at: '2026-09-30T11:14:00+00:00'}));

      await firstValueFrom(create(true, '').submitCertification(request()));

      const options = http.post.calls.mostRecent().args[2];
      expect(options?.headers?.has('Accept-Language') ?? false).toBeFalse();
    });

    it('il GET non manda Accept-Language (oc:8671)', async () => {
      http.get.and.returnValue(of({status: 'none'}));

      await firstValueFrom(create(true, 'en').getCertification(3));

      expect(http.get.calls.mostRecent().args.length).toBe(1);
    });
  });

  describe('ritorno in primo piano: appResume$ (oc:8671)', () => {
    let resumeCb: () => void;
    let remove: jasmine.Spy;
    let register: (value: {remove: () => Promise<void>}) => void;

    let addListener: jasmine.Spy;

    // `App` di Capacitor è un Proxy e non si lascia spiare: lo spy va sul metodo che lo avvolge
    function createWithListener(): PassportService {
      const svc = create();
      addListener = spyOn<any>(svc, '_addResumeListener').and.callFake((cb: () => void) => {
        resumeCb = cb;
        return new Promise(resolve => (register = resolve));
      });
      return svc;
    }

    beforeEach(() => {
      remove = jasmine.createSpy('remove').and.resolveTo();
    });

    it('emette a ogni resume e rimuove il listener alla disiscrizione', async () => {
      const emitted: void[] = [];
      const sub = createWithListener().appResume$().subscribe(v => emitted.push(v));
      register({remove});
      await Promise.resolve();

      resumeCb();
      resumeCb();
      sub.unsubscribe();
      await Promise.resolve();

      expect(addListener).toHaveBeenCalledTimes(1);
      expect(emitted.length).toBe(2);
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('rimuove il listener anche se la disiscrizione arriva prima della registrazione', async () => {
      const sub = createWithListener().appResume$().subscribe();
      sub.unsubscribe();

      register({remove});
      await Promise.resolve();
      await Promise.resolve();

      expect(remove).toHaveBeenCalledTimes(1);
    });
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
